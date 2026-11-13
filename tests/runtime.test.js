import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { io } from "socket.io-client";
// Launch the real entrypoint: adapter tests alone cannot detect SSR or socket wiring errors.
test(
  "real server renders catalog HTML and authenticates scoped WebSocket notifications",
  { timeout: 25000 },
  async () => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1");
    await once(probe, "listening");
    const port = probe.address().port;
    await new Promise((r) => probe.close(r));
    const origin = `http://localhost:${port}`;
    const child = spawn(process.execPath, ["server/index.js"], {
      env: {
        ...process.env,
        APP_MODE: "demo",
        NODE_ENV: "test",
        PORT: String(port),
        APP_URL: origin,
        JWT_SECRET: "runtime-test-secret-not-for-production-123456",
        DOTENV_CONFIG_PATH: "/nonexistent-repairloop-test-env",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let logs = "",
      customerSocket,
      deniedSocket;
    child.stdout.on("data", (d) => (logs += d));
    child.stderr.on("data", (d) => (logs += d));
    async function post(path, body, cookie) {
      const r = await fetch(`${origin}/api${path}`, {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
      assert.ok(r.ok, `${r.status} ${await r.clone().text()}`);
      return r;
    }
    function socketEvent(socket, event, action) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Timed out waiting for ${event}`)),
          5000,
        );
        socket.once(event, (value) => {
          clearTimeout(timer);
          resolve(value);
        });
        action?.();
      });
    }
    try {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        try {
          ready = (await fetch(`${origin}/api/health`)).ok;
        } catch {}
        if (ready) break;
        if (child.exitCode !== null) throw new Error(logs);
        await new Promise((r) => setTimeout(r, 150));
      }
      assert.ok(ready, logs);
      const html = await (await fetch(origin)).text();
      assert.match(html, /Device diagnosis/);
      assert.match(html, /initial-state/);
      const login = await post("/auth/login", {
        email: "alex@repairloop.local",
        password: "RepairLoopDemo123!",
      });
      const customerCookie = login.headers.get("set-cookie").split(";")[0];
      const adminLogin = await post("/auth/login", {
        email: "admin@repairloop.local",
        password: "RepairLoopDemo123!",
      });
      const adminCookie = adminLogin.headers.get("set-cookie").split(";")[0];
      deniedSocket = io(origin, {
        autoConnect: false,
        reconnection: false,
        transports: ["websocket"],
        extraHeaders: { Origin: origin },
      });
      const denied = await socketEvent(deniedSocket, "connect_error", () =>
        deniedSocket.connect(),
      );
      assert.equal(denied.message, "Unauthorized");
      customerSocket = io(origin, {
        autoConnect: false,
        reconnection: false,
        transports: ["websocket"],
        extraHeaders: { Origin: origin, Cookie: customerCookie },
      });
      await socketEvent(customerSocket, "connect", () =>
        customerSocket.connect(),
      );
      const booking = await (
        await post(
          "/bookings",
          {
            serviceId: "diagnosis",
            device: "Runtime test phone",
            issue: "Check real-time status updates",
          },
          customerCookie,
        )
      ).json();
      // Listen only for the later staff mutation, not the earlier create notification.
      await new Promise((r) => setTimeout(r, 50));
      const event = socketEvent(customerSocket, "booking:updated");
      const updated = await fetch(
        `${origin}/api/bookings/${booking.id}/status`,
        {
          method: "PATCH",
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            Cookie: adminCookie,
          },
          body: JSON.stringify({ status: "CONFIRMED" }),
        },
      );
      assert.equal(updated.status, 200);
      assert.equal((await event).bookingId, booking.id);
    } finally {
      customerSocket?.disconnect();
      deniedSocket?.disconnect();
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  },
);
