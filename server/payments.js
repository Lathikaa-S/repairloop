import { randomUUID } from "node:crypto";
import { HttpError, hmac, safeEqual } from "./security.js";
async function gateway(path, options = {}) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new HttpError(503, "Razorpay test credentials are not configured");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok)
    throw new HttpError(502, "Payment provider could not complete the request");
  return response.json();
}
export function createPayments(store, mode) {
  return {
    async order(booking) {
      if (booking.status === "CANCELLED")
        throw new HttpError(409, "Cancelled bookings cannot be paid");
      let payment = booking.payment;
      if (!payment) {
        const order =
          mode === "demo"
            ? { id: `demo_${randomUUID()}` }
            : await gateway("/orders", {
                method: "POST",
                body: JSON.stringify({
                  amount: booking.amountPaise,
                  currency: "INR",
                  receipt: booking.id,
                }),
              });
        try {
          payment = await store.saveOrder(
            booking.id,
            order.id,
            booking.amountPaise,
          );
        } catch (e) {
          // Concurrent clicks can create an unused provider order, but only one DB order is payable.
          const current = await store.booking(booking.id);
          if (!current.payment) throw e;
          payment = current.payment;
        }
      }
      return {
        ...payment,
        keyId: mode === "demo" ? null : process.env.RAZORPAY_KEY_ID,
        demo: mode === "demo",
      };
    },
    async verify(booking, payload) {
      if (mode === "demo")
        throw new HttpError(400, "Use the labelled demo payment action");
      const p = booking.payment;
      if (!p || payload.razorpay_order_id !== p.providerOrderId)
        throw new HttpError(400, "Order does not match this booking");
      const expected = hmac(
        `${p.providerOrderId}|${payload.razorpay_payment_id}`,
        process.env.RAZORPAY_KEY_SECRET,
      );
      if (!safeEqual(expected, payload.razorpay_signature))
        throw new HttpError(400, "Invalid payment signature");
      const remote = await gateway(
        `/payments/${encodeURIComponent(payload.razorpay_payment_id)}`,
      );
      if (remote.order_id !== p.providerOrderId || remote.status !== "captured")
        throw new HttpError(
          409,
          "Payment is not captured yet; wait for the webhook",
        );
      return store.markPaid(
        p.providerOrderId,
        remote.id,
        remote.amount,
        remote.currency,
      );
    },
    async webhook(raw, signature) {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) throw new HttpError(503, "Webhook secret is not configured");
      if (!safeEqual(hmac(raw, secret), signature))
        throw new HttpError(400, "Invalid webhook signature");
      const body = JSON.parse(raw.toString());
      if (body.event !== "payment.captured") return { ignored: true };
      const p = body.payload?.payment?.entity;
      if (!p || p.status !== "captured")
        throw new HttpError(400, "Invalid captured payment");
      return store.markPaid(p.order_id, p.id, p.amount, p.currency);
    },
  };
}
