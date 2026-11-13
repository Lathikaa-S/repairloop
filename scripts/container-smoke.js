import assert from "node:assert/strict";
// CI starts the production image against its real database service containers first.
const origin = process.env.SMOKE_URL || "http://localhost:3000";
let healthy = false;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const response = await fetch(`${origin}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    const body = await response.json();
    healthy = response.ok && body.mode === "live";
  } catch {}
  if (healthy) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert.ok(healthy, "Production container did not become healthy");
const response = await fetch(origin),
  html = await response.text();
assert.equal(response.status, 200);
assert.match(html, /Device diagnosis/);
assert.ok(response.headers.get("content-security-policy"));
const asset = html.match(/src="([^"]+\.js)"/);
assert.ok(asset, "Built browser entry is missing");
assert.equal((await fetch(`${origin}${asset[1]}`)).status, 200);
assert.equal((await fetch(`${origin}/api/bookings`)).status, 401);
console.log(
  "Production container: real-service health, SSR, browser assets, CSP and unauthenticated API rejection passed.",
);
