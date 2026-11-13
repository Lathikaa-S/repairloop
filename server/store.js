import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { catalog } from "./catalog.js";
import { HttpError, checkTransition } from "./security.js";

export async function createStore(mode) {
  if (mode !== "demo") return new SqlStore(new PrismaClient());
  const store = new MemoryStore();
  // Public demo credentials are intentional and cannot be enabled in production.
  const passwordHash = await bcrypt.hash("RepairLoopDemo123!", 12);
  for (const [id, name, role] of [
    ["demo-customer", "Alex Morgan", "CUSTOMER"],
    ["demo-admin", "Sam Patel", "ADMIN"],
  ])
    store.users.push({
      id,
      name,
      role,
      email:
        role === "ADMIN" ? "admin@repairloop.local" : "alex@repairloop.local",
      passwordHash,
    });
  return store;
}

export class SqlStore {
  constructor(db) {
    this.db = db;
  }
  async health() {
    await this.db.$queryRaw`SELECT 1`;
    return true;
  }
  usersByEmail(email) {
    return this.db.user.findUnique({ where: { email } });
  }
  userById(id) {
    return this.db.user.findUnique({ where: { id } });
  }
  createUser(data) {
    return this.db.user.create({ data });
  }
  googleUser(googleId) {
    return this.db.user.findUnique({ where: { googleId } });
  }
  services() {
    return this.db.service.findMany({ orderBy: { pricePaise: "asc" } });
  }
  service(id) {
    return this.db.service.findUnique({ where: { id } });
  }
  bookings(user) {
    return this.db.booking.findMany({
      where: user.role === "CUSTOMER" ? { userId: user.id } : {},
      include: {
        service: true,
        payment: true,
        events: { orderBy: { createdAt: "asc" } },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  booking(id) {
    return this.db.booking.findUnique({
      where: { id },
      include: {
        service: true,
        payment: true,
        events: { orderBy: { createdAt: "asc" } },
        attachments: true,
      },
    });
  }
  createBooking(userId, input, amountPaise) {
    return this.db.booking.create({
      data: {
        ...input,
        userId,
        amountPaise,
        events: {
          create: {
            kind: "REQUESTED",
            message: "Your repair request has been received.",
          },
        },
      },
      include: {
        service: true,
        payment: true,
        events: true,
        attachments: true,
      },
    });
  }
  async transition(id, to) {
    // Optimistic compare-and-swap prevents two technicians overwriting each other.
    await this.db.$transaction(async (tx) => {
      const b = await tx.booking.findUniqueOrThrow({ where: { id } });
      checkTransition(b.status, to);
      const changed = await tx.booking.updateMany({
        where: { id, status: b.status },
        data: { status: to },
      });
      if (changed.count !== 1)
        throw new HttpError(409, "Booking changed; refresh and try again");
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          kind: to,
          message: `Repair status changed to ${to.toLowerCase().replaceAll("_", " ")}.`,
        },
      });
    });
    return this.booking(id);
  }
  async saveOrder(bookingId, providerOrderId, amountPaise) {
    return this.db.payment.create({
      data: { bookingId, providerOrderId, amountPaise },
    });
  }
  paymentByOrder(providerOrderId) {
    return this.db.payment.findUnique({ where: { providerOrderId } });
  }
  async markPaid(orderId, paymentId, amountPaise, currency) {
    // Payment and timeline event commit together. Duplicate webhook deliveries are harmless.
    return this.db.$transaction(async (tx) => {
      const p = await tx.payment.findUnique({
        where: { providerOrderId: orderId },
      });
      if (!p || p.amountPaise !== amountPaise || p.currency !== currency)
        throw new HttpError(400, "Payment amount or currency mismatch");
      if (p.status === "PAID") {
        if (p.providerPaymentId !== paymentId)
          throw new HttpError(409, "Different payment already recorded");
        return p;
      }
      const changed = await tx.payment.updateMany({
        where: { id: p.id, status: "CREATED" },
        data: { status: "PAID", providerPaymentId: paymentId },
      });
      if (changed.count)
        await tx.bookingEvent.create({
          data: {
            bookingId: p.bookingId,
            kind: "PAYMENT",
            message: "Payment verified by the server.",
            dedupeKey: `payment:${orderId}`,
          },
        });
      const recorded = await tx.payment.findUnique({ where: { id: p.id } });
      // A competing capture may have committed while updateMany waited for its row lock.
      // A duplicate of that payment is safe; a different capture needs reconciliation.
      if (recorded.providerPaymentId !== paymentId)
        throw new HttpError(409, "Different payment already recorded");
      return recorded;
    });
  }
  addAttachment(data) {
    return this.db.attachment.create({ data });
  }
  attachment(id) {
    return this.db.attachment.findUnique({ where: { id } });
  }
  async reminders() {
    const rows = await this.db.booking.findMany({
      where: {
        status: "READY",
        updatedAt: { lt: new Date(Date.now() - 86400000) },
      },
      take: 100,
    });
    for (const b of rows)
      await this.db.bookingEvent.upsert({
        where: { dedupeKey: `pickup:${b.id}` },
        create: {
          bookingId: b.id,
          kind: "REMINDER",
          message: "Your device is ready for collection.",
          dedupeKey: `pickup:${b.id}`,
        },
        update: {},
      });
    return rows.length;
  }
  async report() {
    // A real SQL JOIN plus filtering/grouping/ordering; tagged SQL parameterizes values.
    return this.db
      .$queryRaw`SELECT s.name, COUNT(b.id)::int AS bookings, COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p."amountPaise" ELSE 0 END),0)::int AS "paidPaise" FROM "Service" s LEFT JOIN "Booking" b ON b."serviceId"=s.id AND b.status <> ${"CANCELLED"} LEFT JOIN "Payment" p ON p."bookingId"=b.id GROUP BY s.id,s.name ORDER BY bookings DESC`;
  }
  async close() {
    await this.db.$disconnect();
  }
}

// A deliberately separate adapter makes demo behavior explicit and testable.
export class MemoryStore {
  users = [];
  rows = [];
  payments = [];
  files = [];
  async health() {
    return true;
  }
  async close() {}
  async usersByEmail(email) {
    return this.users.find((u) => u.email === email);
  }
  async userById(id) {
    return this.users.find((u) => u.id === id);
  }
  async googleUser(googleId) {
    return this.users.find((u) => u.googleId === googleId);
  }
  async createUser(data) {
    if (await this.usersByEmail(data.email))
      throw new HttpError(409, "Email already registered");
    const u = { id: randomUUID(), role: "CUSTOMER", ...data };
    this.users.push(u);
    return u;
  }
  async services() {
    return catalog;
  }
  async service(id) {
    return catalog.find((s) => s.id === id);
  }
  hydrate(b) {
    return (
      b && {
        ...b,
        service: catalog.find((s) => s.id === b.serviceId),
        payment: this.payments.find((p) => p.bookingId === b.id) || null,
        attachments: this.files.filter((f) => f.bookingId === b.id),
      }
    );
  }
  async bookings(user) {
    return this.rows
      .filter((b) => user.role !== "CUSTOMER" || b.userId === user.id)
      .slice()
      .reverse()
      .map((b) => this.hydrate(b));
  }
  async booking(id) {
    return this.hydrate(this.rows.find((b) => b.id === id));
  }
  async createBooking(userId, input, amountPaise) {
    const b = {
      id: randomUUID(),
      userId,
      ...input,
      amountPaise,
      status: "REQUESTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [
        {
          id: randomUUID(),
          kind: "REQUESTED",
          message: "Your repair request has been received.",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    this.rows.push(b);
    return this.hydrate(b);
  }
  async transition(id, to) {
    const b = this.rows.find((b) => b.id === id);
    if (!b) throw new HttpError(404, "Booking not found");
    checkTransition(b.status, to);
    b.status = to;
    b.updatedAt = new Date().toISOString();
    b.events.push({
      id: randomUUID(),
      kind: to,
      message: `Repair status changed to ${to}.`,
      createdAt: b.updatedAt,
    });
    return this.hydrate(b);
  }
  async saveOrder(bookingId, providerOrderId, amountPaise) {
    if (this.payments.some((p) => p.bookingId === bookingId))
      throw new HttpError(409, "Order already exists");
    const p = {
      id: randomUUID(),
      bookingId,
      providerOrderId,
      amountPaise,
      currency: "INR",
      status: "CREATED",
    };
    this.payments.push(p);
    return p;
  }
  async paymentByOrder(id) {
    return this.payments.find((p) => p.providerOrderId === id);
  }
  async markPaid(orderId, paymentId, amount, currency) {
    const p = await this.paymentByOrder(orderId);
    if (!p || p.amountPaise !== amount || p.currency !== currency)
      throw new HttpError(400, "Payment amount or currency mismatch");
    if (p.status === "PAID") {
      if (p.providerPaymentId !== paymentId)
        throw new HttpError(409, "Different payment already recorded");
      return p;
    }
    p.status = "PAID";
    p.providerPaymentId = paymentId;
    this.rows
      .find((b) => b.id === p.bookingId)
      .events.push({
        id: randomUUID(),
        kind: "PAYMENT",
        message: "Demo payment recorded. No money moved.",
        createdAt: new Date().toISOString(),
      });
    return p;
  }
  async addAttachment(data) {
    const f = { id: randomUUID(), ...data };
    this.files.push(f);
    return f;
  }
  async attachment(id) {
    return this.files.find((f) => f.id === id);
  }
  async reminders() {
    let n = 0;
    for (const b of this.rows)
      if (
        b.status === "READY" &&
        Date.now() - new Date(b.updatedAt) > 86400000 &&
        !b.events.some((e) => e.kind === "REMINDER")
      ) {
        b.events.push({
          id: randomUUID(),
          kind: "REMINDER",
          message: "Your device is ready for collection.",
          createdAt: new Date().toISOString(),
        });
        n++;
      }
    return n;
  }
  async report() {
    return catalog.map((s) => ({
      name: s.name,
      bookings: this.rows.filter(
        (b) => b.serviceId === s.id && b.status !== "CANCELLED",
      ).length,
      paidPaise: this.payments
        .filter(
          (p) =>
            p.status === "PAID" &&
            this.rows.find((b) => b.id === p.bookingId)?.serviceId === s.id,
        )
        .reduce((n, p) => n + p.amountPaise, 0),
    }));
  }
}
