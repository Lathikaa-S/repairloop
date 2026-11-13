import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import cron from "node-cron";
import { createStore } from "./store.js";
import { createKnowledge } from "./knowledge.js";
import { createCache } from "./cache.js";
import { createApp } from "./app.js";
import { verifyToken } from "./security.js";
const mode = process.env.APP_MODE || "demo",
  production = process.env.NODE_ENV === "production";
if (!["demo", "live"].includes(mode))
  throw new Error("APP_MODE must be demo or live");
if (production && mode === "demo")
  throw new Error(
    "Production requires APP_MODE=live; demo credentials are public",
  );
const secret =
  process.env.JWT_SECRET ||
  (mode === "demo" ? "demo-only-secret-never-use-in-production-12345" : "");
if (secret.length < 32 || secret.startsWith("replace-"))
  throw new Error("Set a random JWT_SECRET of at least 32 characters");
const port = Number(process.env.PORT || 3000),
  origin = process.env.APP_URL || `http://localhost:${port}`;
const store = await createStore(mode),
  knowledge = await createKnowledge(mode),
  cache = createCache(mode);
let io;
const app = createApp({
  store,
  knowledge,
  cache,
  mode,
  secret,
  origin,
  emit: (userId, event) => {
    io?.to(`user:${userId}`).to("staff").emit("booking:updated", event);
  },
});
const server = createServer(app);
io = new Server(server, {
  allowRequest: (req, callback) =>
    callback(
      null,
      req.headers.origin === origin ||
        (!req.headers.origin && req.headers.host === new URL(origin).host),
    ),
  maxHttpBufferSize: 10000,
});
io.use(async (socket, next) => {
  try {
    const cookies = Object.fromEntries(
      (socket.handshake.headers.cookie || "")
        .split(";")
        .filter((x) => x.includes("="))
        .map((x) => {
          const i = x.indexOf("=");
          return [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1))];
        }),
    );
    const claims = verifyToken(cookies.session, secret),
      user = await store.userById(claims.sub);
    if (!user) throw new Error();
    socket.data.user = user;
    socket.data.exp = claims.exp;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});
io.on("connection", (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  if (user.role !== "CUSTOMER") socket.join("staff");
  const timer = setTimeout(
    () => socket.disconnect(true),
    Math.max(0, socket.data.exp * 1000 - Date.now()),
  );
  socket.on("disconnect", () => clearTimeout(timer));
});
let vite;
if (!production) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });
  app.use(vite.middlewares);
} else app.use(express.static("dist/client", { index: false }));
app.use(async (req, res, next) => {
  if (req.method !== "GET") return res.sendStatus(404);
  try {
    let template = await readFile(
      production ? "dist/client/index.html" : "index.html",
      "utf8",
    );
    if (vite)
      template = await vite.transformIndexHtml(req.originalUrl, template);
    const { render } = vite
      ? await vite.ssrLoadModule("/client/entry-server.jsx")
      : await import(path.resolve("dist/server/entry-server.js"));
    const initial = { services: await store.services(), mode };
    const html = render(req.originalUrl, initial);
    // JSON is inert data; escaping < prevents closing the script tag with user content.
    const state = JSON.stringify(initial).replaceAll("<", "\\u003c");
    res.setHeader("Cache-Control", "no-store");
    res
      .status(200)
      .type("html")
      .send(
        template
          .replace("<!--app-html-->", html)
          .replace(
            "<!--app-state-->",
            `<script id="initial-state" type="application/json">${state}</script>`,
          ),
      );
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    next(e);
  }
});
app.use((err, req, res, next) => {
  console.error(err.name);
  res.status(500).send("Unable to render this page");
});
// Idempotent persistent reminder keys make repeat runs safe. The UI reads the stored timeline.
const job = cron.schedule(
  "0 * * * *",
  () =>
    store
      .reminders()
      .catch((e) => console.error("Reminder job failed", e.name)),
  { noOverlap: true, timezone: "UTC" },
);
server.listen(port, "0.0.0.0", () =>
  console.log(`RepairLoop ${mode} at ${origin}`),
);
async function shutdown() {
  job.stop();
  io.close();
  await vite?.close();
  server.close();
  await Promise.allSettled([store.close(), knowledge.close(), cache.close()]);
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
