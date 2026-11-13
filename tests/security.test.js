import test from "node:test";
import assert from "node:assert/strict";
import {
  bookingInput,
  articleInput,
  imageType,
  hmac,
  safeEqual,
  signToken,
  verifyToken,
  canRead,
  checkTransition,
} from "../server/security.js";
import { cosine, adviceSchema } from "../server/ai.js";
import {
  eventLoopDemo,
  hoistingDemo,
  makeCounter,
  callbackToPromise,
} from "../client/js-lab.js";
test("validation rejects NoSQL operators, mass assignment, and short descriptions", () => {
  assert.equal(
    bookingInput.safeParse({
      serviceId: { $ne: null },
      device: "Phone",
      issue: "A broken display",
    }).success,
    false,
  );
  assert.equal(
    bookingInput.safeParse({
      serviceId: "screen",
      device: "Phone",
      issue: "A broken display",
      amountPaise: 1,
    }).success,
    false,
  );
  assert.equal(
    articleInput.safeParse({ title: "Guide", text: "x", tags: [] }).success,
    false,
  );
});
test("HMAC compares exactly and does not accept truncated signatures", () => {
  const value = hmac("order|payment", "secret");
  assert.ok(safeEqual(value, hmac("order|payment", "secret")));
  assert.ok(!safeEqual(value, value.slice(1)));
  assert.ok(!safeEqual(value, hmac("other", "secret")));
});
test("JWT verifies audience, issuer and secret", () => {
  const token = signToken({ id: "one" }, "test-secret");
  assert.equal(verifyToken(token, "test-secret").sub, "one");
  assert.throws(() => verifyToken(token, "wrong"));
});
test("ownership and state machine reject unauthorized reads and skips", () => {
  assert.throws(() => canRead({ id: "a", role: "CUSTOMER" }, { userId: "b" }), {
    status: 403,
  });
  assert.throws(() => checkTransition("REQUESTED", "COLLECTED"), {
    status: 409,
  });
  assert.doesNotThrow(() => checkTransition("IN_REPAIR", "READY"));
  assert.throws(() => checkTransition("COLLECTED", "REQUESTED"));
});
test("upload byte checking rejects active SVG despite declared MIME", () => {
  assert.equal(imageType(Buffer.from('<svg onload="alert(1)"/>')), null);
  assert.equal(
    imageType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
});
test("cosine ranks related vectors and handles empty vectors", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([], []), 0);
});
test("AI output schema rejects invalid urgency and extra fields", () => {
  assert.equal(
    adviceSchema.safeParse({
      summary: "Test",
      steps: [],
      urgency: "ignore",
      sources: [],
    }).success,
    false,
  );
});
test("event loop, hoisting, callbacks and closures are executable", async () => {
  assert.deepEqual(await eventLoopDemo(), [
    "1. synchronous start",
    "2. synchronous end",
    "3. Promise callback (microtask)",
    "4. timer callback (task)",
  ]);
  assert.ok(
    hoistingDemo().includes("let before initialization: ReferenceError"),
  );
  const a = makeCounter(),
    b = makeCounter();
  assert.equal(a(), 1);
  assert.equal(a(), 2);
  assert.equal(b(), 1);
  assert.equal(await callbackToPromise((cb) => cb(null, 7)), 7);
  await assert.rejects(callbackToPromise((cb) => cb(new Error("failure"))));
});
