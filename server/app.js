import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import {
  HttpError,
  bookingInput,
  registerInput,
  loginInput,
  articleInput,
  publicUser,
  signToken,
  verifyToken,
  requireRole,
  canRead,
  imageType,
  text,
} from "./security.js";
import { createPayments } from "./payments.js";
import { createAI } from "./ai.js";
import { mountOAuth } from "./oauth.js";

export function createApp({
  store,
  knowledge,
  cache,
  mode = "demo",
  secret,
  origin = "http://localhost:3000",
  emit = () => {},
  uploadDir = path.resolve("uploads"),
}) {
  const app = express(),
    production = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge: 7200000,
  };
  const payments = createPayments(store, mode),
    ai = createAI({ store, knowledge, mode });
  app.disable("x-powered-by");
  // One trusted reverse proxy is opt-in; arbitrary X-Forwarded-For is not trusted.
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "https://checkout.razorpay.com"],
              connectSrc: ["'self'", "https://api.razorpay.com"],
              frameSrc: [
                "https://api.razorpay.com",
                "https://checkout.razorpay.com",
              ],
              imgSrc: ["'self'", "data:"],
              styleSrc: ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
    }),
  );
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-ID", req.requestId);
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  // Webhooks must see original bytes before the JSON parser; they use HMAC instead of cookies.
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json", limit: "64kb" }),
    async (req, res) => {
      const result = await payments.webhook(
        req.body,
        req.headers["x-razorpay-signature"],
      );
      if (result.bookingId) await notify(result.bookingId);
      res.json({ received: true });
    },
  );
  app.use(express.json({ limit: "32kb" }), cookieParser());
  app.use("/api", (req, res, next) => {
    // Same-origin mutations plus SameSite cookies defend browser CSRF. Non-browser callers need a bearer token.
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !req.headers.authorization &&
      req.headers.origin !== origin
    )
      return next(new HttpError(403, "A matching Origin header is required"));
    next();
  });
  const auth = async (req, res, next) => {
    try {
      const raw =
        req.cookies.session ||
        req.headers.authorization?.replace(/^Bearer /, "");
      if (!raw) throw new Error();
      const claims = verifyToken(raw, secret);
      req.user = await store.userById(claims.sub);
      if (!req.user) throw new Error();
    } catch {
      return next(new HttpError(401, "Please sign in to continue"));
    }
    next();
  };
  const staff = (req, res, next) => {
    requireRole(req.user, "ADMIN", "TECHNICIAN");
    next();
  };
  async function notify(id) {
    const booking = await store.booking(id);
    emit(booking.userId, { bookingId: id });
    return booking;
  }
  app.get("/api/health", async (req, res) => {
    const checks = await Promise.allSettled([
      store.health(),
      knowledge.health(),
      cache.health(),
    ]);
    const ok = checks.every((x) => x.status === "fulfilled");
    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      mode,
      dependencies: {
        postgres: checks[0].status,
        mongo: checks[1].status,
        redis: checks[2].status,
      },
    });
  });
  app.get("/api/config", (req, res) =>
    res.json({
      mode,
      googleEnabled: !!process.env.GOOGLE_CLIENT_ID,
      paymentsEnabled: mode === "demo" || !!process.env.RAZORPAY_KEY_ID,
      aiEnabled: mode === "demo" || !!process.env.OPENAI_API_KEY,
    }),
  );
  const loginLimit = rateLimit({
    windowMs: 900000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.post("/api/auth/register", loginLimit, async (req, res) => {
    const data = registerInput.parse(req.body);
    if (await store.usersByEmail(data.email))
      throw new HttpError(409, "Email already registered");
    const { password, ...profile } = data;
    const user = await store.createUser({
      ...profile,
      passwordHash: await bcrypt.hash(password, 12),
    });
    res
      .cookie("session", signToken(user, secret), cookieOptions)
      .status(201)
      .json(publicUser(user));
  });
  app.post("/api/auth/login", loginLimit, async (req, res) => {
    const data = loginInput.parse(req.body),
      user = await store.usersByEmail(data.email);
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(data.password, user.passwordHash))
    )
      throw new HttpError(401, "Email or password is incorrect");
    res
      .cookie("session", signToken(user, secret), cookieOptions)
      .json(publicUser(user));
  });
  app.post("/api/auth/logout", (req, res) =>
    res
      .clearCookie("session", { ...cookieOptions, maxAge: undefined })
      .sendStatus(204),
  );
  app.get("/api/auth/me", auth, (req, res) => res.json(publicUser(req.user)));
  mountOAuth(app, { store, cache, secret, origin, cookieOptions });
  app.get("/api/services", async (req, res) => {
    // Cache-aside: read cache, fall back to source, then cache a short-lived public result.
    const hit = await cache.get("services:v1");
    res.setHeader("X-Cache", hit ? "HIT" : "MISS");
    if (hit) return res.json(JSON.parse(hit));
    const rows = await store.services();
    await cache.set("services:v1", JSON.stringify(rows), 60);
    res.json(rows);
  });
  app.get("/api/bookings", auth, async (req, res) =>
    res.json(await store.bookings(req.user)),
  );
  app.post("/api/bookings", auth, async (req, res) => {
    const data = bookingInput.parse(req.body),
      service = await store.service(data.serviceId);
    if (!service) throw new HttpError(404, "Service not found");
    const b = await store.createBooking(req.user.id, data, service.pricePaise);
    emit(req.user.id, { bookingId: b.id });
    res.status(201).json(b);
  });
  app.get("/api/bookings/:id", auth, async (req, res) =>
    res.json(canRead(req.user, await store.booking(req.params.id))),
  );
  app.patch("/api/bookings/:id/status", auth, staff, async (req, res) => {
    const { status } = z
      .object({
        status: z.enum([
          "CONFIRMED",
          "IN_REPAIR",
          "READY",
          "COLLECTED",
          "CANCELLED",
        ]),
      })
      .strict()
      .parse(req.body);
    if (!(await store.booking(req.params.id)))
      throw new HttpError(404, "Booking not found");
    await store.transition(req.params.id, status);
    res.json(await notify(req.params.id));
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0 },
  });
  app.post(
    "/api/bookings/:id/attachments",
    auth,
    async (req, res, next) => {
      canRead(req.user, await store.booking(req.params.id));
      next();
    },
    upload.single("photo"),
    async (req, res) => {
      if (!req.file) throw new HttpError(400, "Choose a PNG or JPEG photo");
      const mime = imageType(req.file.buffer);
      if (!mime || mime !== req.file.mimetype)
        throw new HttpError(
          415,
          "Only PNG or JPEG files with matching content are accepted",
        );
      await mkdir(uploadDir, { recursive: true });
      const filename = `${randomUUID()}.${mime === "image/png" ? "png" : "jpg"}`,
        target = path.join(uploadDir, filename);
      await writeFile(target, req.file.buffer, { flag: "wx" });
      try {
        const f = await store.addAttachment({
          bookingId: req.params.id,
          filename,
          mime,
          size: req.file.size,
        });
        res.status(201).json(f);
      } catch (e) {
        await unlink(target);
        throw e;
      }
    },
  );
  app.get("/api/attachments/:id", auth, async (req, res) => {
    const file = await store.attachment(req.params.id);
    if (!file) throw new HttpError(404, "Photo not found");
    canRead(req.user, await store.booking(file.bookingId));
    res.setHeader("Cache-Control", "private, no-store");
    res.type(file.mime).sendFile(path.join(uploadDir, file.filename));
  });
  app.post("/api/bookings/:id/payment-order", auth, async (req, res) => {
    const b = canRead(req.user, await store.booking(req.params.id));
    res.json(await payments.order(b));
  });
  app.post("/api/bookings/:id/payment-verify", auth, async (req, res) => {
    const b = canRead(req.user, await store.booking(req.params.id));
    const data = z
      .object({
        razorpay_order_id: text(1, 100),
        razorpay_payment_id: text(1, 100),
        razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(req.body);
    await payments.verify(b, data);
    res.json(await notify(b.id));
  });
  app.post("/api/bookings/:id/demo-payment", auth, async (req, res) => {
    if (mode !== "demo") throw new HttpError(404, "Not found");
    const b = canRead(req.user, await store.booking(req.params.id)),
      p = await payments.order(b);
    await store.markPaid(
      p.providerOrderId,
      `demo-payment-${b.id}`,
      b.amountPaise,
      "INR",
    );
    res.json(await notify(b.id));
  });
  app.get("/api/knowledge", async (req, res) =>
    res.json(await knowledge.list()),
  );
  app.post("/api/knowledge", auth, staff, async (req, res) =>
    res.status(201).json(
      await knowledge.create({
        ...articleInput.parse(req.body),
        authorId: req.user.id,
      }),
    ),
  );
  app.put("/api/knowledge/:id", auth, staff, async (req, res) => {
    const row = await knowledge.update(
      req.params.id,
      articleInput.parse(req.body),
    );
    if (!row) throw new HttpError(404, "Article not found");
    res.json(row);
  });
  app.delete("/api/knowledge/:id", auth, staff, async (req, res) => {
    if (!(await knowledge.remove(req.params.id)))
      throw new HttpError(404, "Article not found");
    res.sendStatus(204);
  });
  app.get("/api/reports", auth, staff, async (req, res) =>
    res.json({
      services: await store.report(),
      tags: await knowledge.stats(),
      aiUsage: await knowledge.usage(),
    }),
  );
  app.post(
    "/api/assistant",
    auth,
    rateLimit({ windowMs: 60000, limit: 5 }),
    async (req, res) => {
      const { question } = z
        .object({ question: text(5, 2000) })
        .strict()
        .parse(req.body);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      const send = (event, data) => {
        if (!res.destroyed)
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      try {
        send("status", { message: "Checking repair guidance…" });
        const result = await ai.answer(req.user, question, (delta) =>
          send("delta", { text: delta }),
        );
        send("result", result);
      } catch (e) {
        send("error", {
          message: e.status
            ? e.message
            : "Assistant unavailable; please try again",
        });
      } finally {
        res.end();
      }
    },
  );
  app.use("/api", (req, res, next) =>
    next(new HttpError(404, "API endpoint not found")),
  );
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = error.status || 500,
      message = error.message;
    if (error instanceof z.ZodError) {
      status = 422;
      message = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    }
    if (error instanceof multer.MulterError) {
      status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      message = "Upload must contain one image no larger than 3 MB";
    }
    if (error.code === "P2002") {
      status = 409;
      message = "This record already exists";
    }
    if (error instanceof SyntaxError) {
      status = 400;
      message = "Invalid JSON request";
    }
    if (status >= 500) {
      console.error(
        JSON.stringify({
          requestId: req.requestId,
          type: error.name,
          code: error.code || "INTERNAL",
        }),
      );
      message = error.status
        ? message
        : "The service is unavailable. Please try again.";
    }
    res.status(status).json({ error: { message, requestId: req.requestId } });
  });
  return app;
}
