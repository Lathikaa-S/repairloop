import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { SqlStore } from "../server/store.js";
import { createKnowledge } from "../server/knowledge.js";
import { createCache } from "../server/cache.js";
import { createApp } from "../server/app.js";
import { catalog } from "../server/catalog.js";
import { signToken } from "../server/security.js";
test(
  "real PostgreSQL transactions/JOINs, Mongo CRUD/aggregation, Redis TTL, and live-mode API",
  { skip: process.env.INTEGRATION !== "true" },
  async () => {
    const db = new PrismaClient(),
      store = new SqlStore(db),
      knowledge = await createKnowledge("live"),
      cache = createCache("live");
    const tag = `integration-${randomUUID()}`,
      secret = "integration-secret-at-least-32-characters";
    let user, booking, article;
    try {
      await Promise.all([store.health(), knowledge.health(), cache.health()]);
      for (const s of catalog)
        await db.service.upsert({ where: { id: s.id }, create: s, update: {} });
      user = await store.createUser({
        email: `${tag}@example.test`,
        name: "Integration Customer",
      });
      const app = createApp({ store, knowledge, cache, mode: "live", secret }),
        token = signToken(user, secret);
      booking = (
        await request(app)
          .post("/api/bookings")
          .set("Authorization", `Bearer ${token}`)
          .send({
            serviceId: "diagnosis",
            device: "Integration device",
            issue: "A real database integration check",
          })
          .expect(201)
      ).body;
      await store.saveOrder(booking.id, `order-${tag}`, 29900);
      await assert.rejects(
        store.markPaid(`order-${tag}`, `pay-${tag}`, 1, "INR"),
        { status: 400 },
      );
      assert.equal((await store.booking(booking.id)).payment.status, "CREATED");
      await Promise.all([
        store.markPaid(`order-${tag}`, `pay-${tag}`, 29900, "INR"),
        store.markPaid(`order-${tag}`, `pay-${tag}`, 29900, "INR"),
      ]);
      const paid = await store.booking(booking.id);
      assert.equal(paid.payment.status, "PAID");
      assert.equal(paid.events.filter((e) => e.kind === "PAYMENT").length, 1);
      await request(app)
        .post(`/api/bookings/${booking.id}/demo-payment`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(404);
      for (const status of ["CONFIRMED", "IN_REPAIR", "READY"])
        await store.transition(booking.id, status);
      await db.booking.update({
        where: { id: booking.id },
        data: { updatedAt: new Date(Date.now() - 2 * 86400000) },
      });
      await store.reminders();
      await store.reminders();
      assert.equal(
        (await store.booking(booking.id)).events.filter(
          (e) => e.kind === "REMINDER",
        ).length,
        1,
      );
      const report = await store.report();
      assert.ok(
        report.find((r) => r.name === "Device diagnosis").paidPaise >= 29900,
      );
      // Compare-and-swap allows at most one conflicting transition.
      const results = await Promise.allSettled([
        store.transition(booking.id, "COLLECTED"),
        store.transition(booking.id, "COLLECTED"),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      article = await knowledge.create({
        title: tag,
        text: "Integration guide with bounded embedded tags.",
        tags: [tag],
        authorId: user.id,
      });
      await knowledge.setVector(article._id, [1, 0, 0], "test-model");
      assert.ok(
        (await knowledge.allVectors()).some(
          (r) => r._id.toString() === article._id.toString(),
        ),
      );
      const updated = await knowledge.update(article._id, {
        title: tag,
        text: "Updated integration guide text.",
        tags: [tag],
      });
      assert.equal(updated.revision.number, 2);
      assert.equal(updated.embedding.length, 0);
      assert.equal(
        (await knowledge.stats()).find((x) => x._id === tag).articles,
        1,
      );
      await cache.set(tag, "cached", 1);
      assert.equal(await cache.get(tag), "cached");
      await new Promise((r) => setTimeout(r, 1100));
      assert.equal(await cache.get(tag), null);
      await knowledge.remove(article._id);
      article = null;
    } finally {
      if (article) await knowledge.remove(article._id);
      if (booking) {
        await db.bookingEvent.deleteMany({ where: { bookingId: booking.id } });
        await db.payment.deleteMany({ where: { bookingId: booking.id } });
        await db.booking.delete({ where: { id: booking.id } });
      }
      if (user) await db.user.delete({ where: { id: user.id } });
      await cache.del(tag);
      await Promise.allSettled([
        store.close(),
        knowledge.close(),
        cache.close(),
      ]);
    }
  },
);
