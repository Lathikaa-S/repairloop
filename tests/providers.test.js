import test from "node:test";
import assert from "node:assert/strict";
import { createAI } from "../server/ai.js";
import { DemoKnowledge } from "../server/knowledge.js";
import { MemoryStore } from "../server/store.js";
import { createPayments } from "../server/payments.js";
import { hmac } from "../server/security.js";

test("live AI code executes scoped tools, retrieves real-shaped vectors, streams and records usage (mock provider)", async () => {
  const knowledge = new DemoKnowledge(),
    store = new MemoryStore();
  await store.createBooking(
    "owner",
    { serviceId: "diagnosis", device: "Own phone", issue: "Needs checking" },
    29900,
  );
  await store.createBooking(
    "other",
    { serviceId: "diagnosis", device: "PRIVATE OTHER PHONE", issue: "Secret" },
    29900,
  );
  await knowledge.setVector(
    knowledge.rows[0]._id,
    [1, 0, 0],
    "text-embedding-3-small",
  );
  let calls = 0,
    finalInput,
    toolInput;
  const advice = {
    summary: "Stop charging a swollen battery.",
    steps: ["Arrange professional inspection."],
    urgency: "professional",
    sources: ["Swollen batteries"],
  };
  const client = {
    embeddings: {
      create: async () => ({
        data: [{ embedding: [1, 0, 0] }],
        usage: { total_tokens: 5 },
      }),
    },
    responses: {
      create: async (args) => {
        calls++;
        if (args.stream) {
          finalInput = JSON.stringify(args.input);
          assert.equal(args.text.format.strict, true);
          return (async function* () {
            yield {
              type: "response.output_text.delta",
              delta: JSON.stringify(advice).slice(0, 30),
            };
            yield {
              type: "response.output_text.delta",
              delta: JSON.stringify(advice).slice(30),
            };
            yield {
              type: "response.completed",
              response: { usage: { input_tokens: 20, output_tokens: 30 } },
            };
          })();
        }
        if (calls === 1)
          return {
            output: [
              {
                type: "function_call",
                name: "search_repair_guides",
                call_id: "one",
                arguments: '{"query":"swollen battery"}',
              },
              {
                type: "function_call",
                name: "list_my_bookings",
                call_id: "two",
                arguments: "{}",
              },
            ],
            usage: { input_tokens: 10, output_tokens: 5 },
          };
        toolInput = JSON.stringify(args.input);
        return { output: [], usage: { input_tokens: 10, output_tokens: 5 } };
      },
    },
  };
  let deltas = "";
  const result = await createAI({
    mode: "live",
    knowledge,
    store,
    client,
  }).answer(
    { id: "owner", role: "ADMIN" },
    "My battery is swollen",
    (d) => (deltas += d),
  );
  assert.equal(calls, 3);
  assert.equal(result.usage.inputTokens, 40);
  assert.equal(result.usage.outputTokens, 40);
  assert.deepEqual(JSON.parse(deltas), advice);
  assert.match(toolInput, /Own phone/);
  assert.doesNotMatch(finalInput, /PRIVATE OTHER PHONE/);
  assert.match(finalInput, /Swollen batteries/);
  assert.equal(knowledge.logs.length, 4);
  assert.equal(result.mode, "live");
});
test("AI rejects model-supplied identity instead of broadening tool access", async () => {
  const client = {
    responses: {
      create: async () => ({
        output: [
          {
            type: "function_call",
            name: "list_my_bookings",
            call_id: "bad",
            arguments: '{"userId":"victim"}',
          },
        ],
        usage: {},
      }),
    },
  };
  await assert.rejects(
    createAI({
      mode: "live",
      knowledge: new DemoKnowledge(),
      store: new MemoryStore(),
      client,
    }).answer({ id: "owner" }, "Read bookings"),
  );
});
test("AI caps a continuing tool loop and detects an incomplete stream", async () => {
  let decisions = 0;
  const client = {
    responses: {
      create: async (args) => {
        if (args.stream)
          return (async function* () {
            yield { type: "response.output_text.delta", delta: '{"summary":' };
          })();
        decisions++;
        return {
          output: [
            {
              type: "function_call",
              name: "list_my_bookings",
              call_id: `loop-${decisions}`,
              arguments: "{}",
            },
          ],
          usage: {},
        };
      },
    },
  };
  await assert.rejects(
    createAI({
      mode: "live",
      knowledge: new DemoKnowledge(),
      store: new MemoryStore(),
      client,
    }).answer({ id: "owner" }, "Read bookings"),
    { status: 502 },
  );
  assert.equal(decisions, 3);
});
test("Razorpay live adapter trusts server amount and requires captured payment (mock provider)", async () => {
  const original = globalThis.fetch,
    store = new MemoryStore();
  let captured = false;
  process.env.RAZORPAY_KEY_ID = "rzp_test_contract";
  process.env.RAZORPAY_KEY_SECRET = "contract-secret";
  try {
    const b = await store.createBooking(
      "owner",
      { serviceId: "diagnosis", device: "Phone", issue: "Needs checking" },
      29900,
    );
    globalThis.fetch = async (url, options) => {
      if (url.endsWith("/orders")) {
        assert.equal(JSON.parse(options.body).amount, 29900);
        return new Response(JSON.stringify({ id: "order_contract" }), {
          status: 200,
        });
      }
      return new Response(
        JSON.stringify({
          id: "pay_contract",
          order_id: "order_contract",
          amount: 29900,
          currency: "INR",
          status: captured ? "captured" : "authorized",
        }),
        { status: 200 },
      );
    };
    const payments = createPayments(store, "live");
    const order = await payments.order(b);
    assert.equal(order.demo, false);
    const payload = {
      razorpay_order_id: "order_contract",
      razorpay_payment_id: "pay_contract",
      razorpay_signature: hmac(
        "order_contract|pay_contract",
        "contract-secret",
      ),
    };
    await assert.rejects(
      payments.verify(await store.booking(b.id), {
        ...payload,
        razorpay_signature: "bad",
      }),
      { status: 400 },
    );
    await assert.rejects(payments.verify(await store.booking(b.id), payload), {
      status: 409,
    });
    captured = true;
    await payments.verify(await store.booking(b.id), payload);
    assert.equal((await store.booking(b.id)).payment.status, "PAID");
    await payments.verify(await store.booking(b.id), payload);
    assert.equal(
      (await store.booking(b.id)).events.filter((e) => e.kind === "PAYMENT")
        .length,
      1,
    );
  } finally {
    globalThis.fetch = original;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  }
});
