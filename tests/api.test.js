import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/app.js";
import { createStore } from "../server/store.js";
import { createKnowledge } from "../server/knowledge.js";
import { createCache } from "../server/cache.js";
import { signToken, hmac } from "../server/security.js";
const secret = "test-secret-that-is-at-least-32-characters";
async function setup() {
  const store = await createStore("demo"),
    knowledge = await createKnowledge("demo"),
    cache = createCache("demo"),
    uploadDir = await mkdtemp(path.join(os.tmpdir(), "repairloop-test-"));
  const app = createApp({ store, knowledge, cache, secret, uploadDir });
  const token = signToken({ id: "demo-customer" }, secret),
    admin = signToken({ id: "demo-admin" }, secret);
  return {
    store,
    knowledge,
    app,
    token,
    admin,
    cleanup: () => rm(uploadDir, { recursive: true, force: true }),
  };
}
test("booking → simulated payment → technician status → report, including access controls", async () => {
  const c = await setup();
  try {
    const { app, token, admin } = c;
    await request(app).get("/api/bookings").expect(401);
    await request(app)
      .post("/api/auth/login")
      .send({ email: "alex@repairloop.local", password: "RepairLoopDemo123!" })
      .expect(403);
    const login = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "alex@repairloop.local", password: "RepairLoopDemo123!" })
      .expect(200);
    assert.match(login.headers["set-cookie"][0], /HttpOnly/);
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        serviceId: "screen",
        device: "Phone",
        issue: "Cracked display",
        amountPaise: 1,
      })
      .expect(422);
    const b = (
      await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          serviceId: "screen",
          device: "My phone",
          issue: "A cracked screen after dropping it",
        })
        .expect(201)
    ).body;
    assert.equal(b.amountPaise, 149900);
    await request(app)
      .patch(`/api/bookings/${b.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "CONFIRMED" })
      .expect(403);
    await request(app)
      .patch(`/api/bookings/${b.id}/status`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ status: "READY" })
      .expect(409);
    await request(app)
      .patch(`/api/bookings/${b.id}/status`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ status: "CONFIRMED" })
      .expect(200);
    for (let i = 0; i < 2; i++)
      await request(app)
        .post(`/api/bookings/${b.id}/demo-payment`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200);
    const saved = await c.store.booking(b.id);
    assert.equal(saved.payment.status, "PAID");
    assert.equal(saved.events.filter((e) => e.kind === "PAYMENT").length, 1);
    const stranger = await c.store.createUser({
        email: "stranger@example.test",
        name: "Stranger",
      }),
      other = signToken(stranger, secret);
    await request(app)
      .get(`/api/bookings/${b.id}`)
      .set("Authorization", `Bearer ${other}`)
      .expect(403);
    await request(app)
      .get("/api/reports")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    const report = (
      await request(app)
        .get("/api/reports")
        .set("Authorization", `Bearer ${admin}`)
        .expect(200)
    ).body;
    assert.equal(
      report.services.find((s) => s.name === "Screen repair").paidPaise,
      149900,
    );
  } finally {
    await c.cleanup();
  }
});
test("Mongo CRUD surface is staff-only and edits invalidate embeddings", async () => {
  const c = await setup();
  try {
    const data = {
      title: "Care for your laptop",
      text: "Back up your data before arranging a professional inspection.",
      tags: ["laptop"],
    };
    await request(c.app)
      .post("/api/knowledge")
      .set("Authorization", `Bearer ${c.token}`)
      .send(data)
      .expect(403);
    const row = (
      await request(c.app)
        .post("/api/knowledge")
        .set("Authorization", `Bearer ${c.admin}`)
        .send(data)
        .expect(201)
    ).body;
    await c.knowledge.setVector(row._id, [1, 0], "test");
    const updated = (
      await request(c.app)
        .put(`/api/knowledge/${row._id}`)
        .set("Authorization", `Bearer ${c.admin}`)
        .send({ ...data, title: "Updated guide" })
        .expect(200)
    ).body;
    assert.deepEqual(updated.embedding, []);
    await request(c.app)
      .delete(`/api/knowledge/${row._id}`)
      .set("Authorization", `Bearer ${c.admin}`)
      .expect(204);
  } finally {
    await c.cleanup();
  }
});
test("uploads enforce size/type/ownership and require auth for download", async () => {
  const c = await setup();
  try {
    const b = await c.store.createBooking(
      "demo-customer",
      { serviceId: "screen", device: "Phone", issue: "A cracked display" },
      149900,
    );
    await request(c.app)
      .post(`/api/bookings/${b.id}/attachments`)
      .set("Authorization", `Bearer ${c.token}`)
      .attach("photo", Buffer.from("<svg/>"), {
        filename: "x.png",
        contentType: "image/png",
      })
      .expect(415);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    );
    const photo = (
      await request(c.app)
        .post(`/api/bookings/${b.id}/attachments`)
        .set("Authorization", `Bearer ${c.token}`)
        .attach("photo", png, {
          filename: "../../x.png",
          contentType: "image/png",
        })
        .expect(201)
    ).body;
    assert.ok(!photo.filename.includes("/"));
    await request(c.app).get(`/api/attachments/${photo.id}`).expect(401);
    await request(c.app)
      .get(`/api/attachments/${photo.id}`)
      .set("Authorization", `Bearer ${c.token}`)
      .expect(200);
    await request(c.app)
      .post(`/api/bookings/${b.id}/attachments`)
      .set("Authorization", `Bearer ${c.token}`)
      .attach("photo", Buffer.alloc(3 * 1024 * 1024 + 1), {
        filename: "large.png",
        contentType: "image/png",
      })
      .expect(413);
  } finally {
    await c.cleanup();
  }
});
test("signed captured-payment webhooks are idempotent and reject tampering", async () => {
  const c = await setup();
  process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-test";
  try {
    const b = await c.store.createBooking(
      "demo-customer",
      { serviceId: "diagnosis", device: "Phone", issue: "Needs checking" },
      29900,
    );
    await c.store.saveOrder(b.id, "order_test", 29900);
    const raw = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test",
            order_id: "order_test",
            amount: 29900,
            currency: "INR",
            status: "captured",
          },
        },
      },
    });
    await request(c.app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", "bad")
      .send(raw)
      .expect(400);
    for (let i = 0; i < 2; i++)
      await request(c.app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-razorpay-signature", hmac(raw, "webhook-test"))
        .send(raw)
        .expect(200);
    assert.equal(
      (await c.store.booking(b.id)).events.filter((e) => e.kind === "PAYMENT")
        .length,
      1,
    );
  } finally {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    await c.cleanup();
  }
});
test("cache reports miss then hit; assistant streams a clearly marked demo", async () => {
  const c = await setup();
  try {
    assert.equal(
      (await request(c.app).get("/api/services")).headers["x-cache"],
      "MISS",
    );
    assert.equal(
      (await request(c.app).get("/api/services")).headers["x-cache"],
      "HIT",
    );
    const response = await request(c.app)
      .post("/api/assistant")
      .set("Authorization", `Bearer ${c.token}`)
      .send({ question: "My battery is swollen" })
      .expect(200);
    assert.match(response.text, /event: result/);
    assert.match(response.text, /"mode":"demo"/);
    assert.match(response.text, /professional/);
  } finally {
    await c.cleanup();
  }
});
