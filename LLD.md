# Low-Level Design — RepairLoop

## Runtime entry points

`server/index.js` validates mode/secret, creates adapters, mounts REST routes, attaches Socket.IO, installs Vite middleware in development or static assets in production, then renders React HTML. The SSR state includes only catalog and mode. Browser hydration fetches identity and private data afterward, preventing private page state from leaking through shared HTML.

`client/App.jsx` composes shared `Button`, `Field`, `Notice`, `Empty`, `Icon`, `Sidebar`, and `Gate` components into pages. `Gate` improves UX; server middleware enforces real authorization. `Repairs` subscribes to sockets in an effect and disconnects on unmount. Form input values are React state. Async mutations show busy/error states and refetch source-of-truth records.

## API contract

| Method / route | Access | Behavior |
|---|---|---|
| GET /api/health | Public | Checks SQL, Mongo and Redis; 200 healthy, 503 degraded |
| GET /api/config | Public | Exposes feature availability, never credentials |
| POST /api/auth/register | Origin-protected | Strict schema, bcrypt, CUSTOMER, 201 |
| POST /api/auth/login | Origin-protected | Password verification, HttpOnly JWT cookie |
| POST /api/auth/logout | Origin-protected | Clears browser cookie, 204 |
| GET /api/auth/me | Signed in | Public identity fields |
| GET /api/auth/google[/callback] | Public OAuth | State-bound authorization-code flow |
| GET /api/services | Public | Cache-aside catalog, X-Cache HIT/MISS |
| GET/POST /api/bookings | Signed in | Scoped list / server-priced booking creation |
| GET /api/bookings/:id | Owner/staff | Full permitted booking and timeline |
| PATCH /api/bookings/:id/status | Staff | Validated state machine, conflict detection |
| POST /api/bookings/:id/attachments | Owner/staff | Auth before bounded multipart parsing |
| GET /api/attachments/:id | Owner/staff | Protected file bytes, private/no-store |
| POST /api/bookings/:id/payment-order | Owner/staff | Create/reuse authoritative provider order |
| POST /api/bookings/:id/payment-verify | Owner/staff | HMAC + provider capture + amount/currency check |
| POST /api/bookings/:id/demo-payment | Demo only | Explicit no-money simulation; 404 in live mode |
| POST /api/payments/webhook | Valid provider HMAC | Original raw body; captured events only |
| GET /api/knowledge | Public | Bounded article list without vectors in live mode |
| POST /api/knowledge | Staff | Create article, 201 |
| PUT/DELETE /api/knowledge/:id | Staff | Update/invalidate vector or delete, 204 |
| GET /api/reports | Staff | SQL and Mongo aggregate reports |
| POST /api/assistant | Signed in + stricter rate limit | SSE status/delta/result/error events |

Validation uses 422, unauthenticated 401, unauthorized 403, missing 404, conflicting state 409, excessive upload 413, unsupported image 415, provider error 502, and missing configured service 503. Generic internal failures return 500 with request ID and a safe message. Unknown API routes return 404 rather than the SPA shell.

## Payment sequence

1. Load owned booking. Ignore all client amounts; use persisted `amountPaise`.
2. If a payment order exists, return it. Otherwise request a Razorpay order and save it under unique `bookingId`.
3. Client loads Razorpay's checkout script once and opens it with the public key ID/order.
4. Client sends the three Razorpay result fields to verification.
5. Recompute HMAC-SHA256 of the **stored** order ID plus payment ID. Compare in constant time.
6. Fetch provider payment and require `captured`, matching order, amount and currency.
7. Transaction conditionally marks Payment PAID and inserts one BookingEvent. Return persisted state.
8. A raw-body signed `payment.captured` webhook performs the same transaction when the browser is absent.

External order creation and local insert cannot be one atomic transaction. Concurrent requests can leave an unused remote order; only the winning stored order is returned as payable. Production reconciliation/refund handling is outside this version. Cancellation is an operational status change, not a refund instruction; staff must handle any existing payment manually.

## AI sequence

`createAI().answer()` builds a user input with separate system instructions. Up to three decision iterations may request up to three read-only tool calls each. `search_repair_guides` validates a bounded query, obtains a provider embedding, ranks compatible-model Mongo vectors by cosine similarity, and returns three articles. `list_my_bookings` ignores any model-suggested identity and scopes SQL to the caller.

Tool call outputs and original response items are appended to the next model request. A final tool-free request requires strict JSON output and streams actual provider deltas through SSE. Zod validates the completed object. Incomplete/failed generations emit an error. Schema compliance does not establish factual correctness.

Usage records cover each response and embedding request. USD estimates use configurable per-million-token rates; missing rates are stored as null. Cached-input discounts and reasoning-token pricing distinctions are not modeled, so estimates are not billing reconciliation. Live indexing/evaluation incur API costs.

## Upload and storage

Multer holds one file, at most 3 MB, in memory after access checks. MIME must match PNG/JPEG magic bytes. UUID filenames prevent traversal and collisions. On SQL insert failure, the just-written file is removed. File and database commits are not globally atomic: a crash can leave an orphan requiring a cleanup job. A production image service should decode/re-encode images, enforce pixel dimensions, and scan content; magic bytes alone do not prove an entire image is valid.

## Tests and limits

Unit tests exercise validation, auth claims, transitions, HMAC, upload signatures, vectors and JS runtime behavior. HTTP tests use in-memory adapters and verify negative access paths. The separate integration test connects to real SQL/Mongo/Redis, validates transactional behavior and cleans up only its own records. Provider-contract mocks exercise live code paths without claiming real provider acceptance. See VERIFICATION.md for the actual execution record.
