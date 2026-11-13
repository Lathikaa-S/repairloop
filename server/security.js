import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
// Reject objects where strings are expected: {$ne: ...} cannot become a Mongo selector.
export const text = (min, max) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v),
      "Control characters are not allowed",
    );
export const bookingInput = z
  .object({
    serviceId: text(1, 60),
    device: text(2, 120),
    issue: text(10, 2000),
  })
  .strict();
export const registerInput = z
  .object({
    name: text(2, 80),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(12).max(100),
  })
  .strict();
export const loginInput = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(100),
  })
  .strict();
export const articleInput = z
  .object({
    title: text(3, 120),
    text: text(20, 6000),
    tags: z.array(text(1, 30)).max(8),
  })
  .strict();
export function signToken(user, secret) {
  return jwt.sign({ sub: user.id }, secret, {
    expiresIn: "2h",
    issuer: "repairloop",
    audience: "repairloop-web",
    algorithm: "HS256",
  });
}
export function verifyToken(token, secret) {
  return jwt.verify(token, secret, {
    issuer: "repairloop",
    audience: "repairloop-web",
    algorithms: ["HS256"],
  });
}
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function hmac(body, secret) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}
export function requireRole(user, ...roles) {
  if (!roles.includes(user.role))
    throw new HttpError(403, "This action requires a staff account");
}
export function canRead(user, booking) {
  if (!booking) throw new HttpError(404, "Booking not found");
  if (user.role === "CUSTOMER" && booking.userId !== user.id)
    throw new HttpError(403, "This booking belongs to another customer");
  return booking;
}
export const transitions = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_REPAIR", "CANCELLED"],
  IN_REPAIR: ["READY"],
  READY: ["COLLECTED"],
  COLLECTED: [],
  CANCELLED: [],
};
export function checkTransition(from, to) {
  if (!transitions[from]?.includes(to))
    throw new HttpError(409, `Cannot move ${from} to ${to}`);
}
// Match bytes as well as MIME. SVG/HTML are deliberately disallowed active content.
export function imageType(buffer) {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  return null;
}
export function publicUser({ id, name, email, role }) {
  return { id, name, email, role };
}
