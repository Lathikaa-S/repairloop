# High-Level Design — RepairLoop

## Components and request flow

```text
Browser (React + Router)
  ├── HTML request ──> Express SSR ──> public PostgreSQL catalog ──> HTML + hydration
  ├── /api/* ──> validation / auth / authorization ──> domain operations
  ├── /socket.io ──> JWT verification ──> private user room or staff room
  └── /api/assistant ──> SSE stream

Domain operations
  ├── Prisma ──> PostgreSQL: User, Service, Booking, Payment, BookingEvent, Attachment
  ├── Mongoose ──> MongoDB: Article, Usage
  ├── Redis: public catalog TTL + one-time OAuth state
  ├── Razorpay: create order / verify capture / signed webhook
  ├── Google: code exchange / verified userinfo
  └── OpenAI: embeddings / tool decisions / structured streamed advice

Hourly scheduler ──> READY bookings older than 24h ──> unique reminder events
```

## Why two databases?

PostgreSQL owns transactional and relational facts. Payment and its corresponding timeline event must commit together. Foreign keys prevent orphan SQL records; unique constraints enforce email/order/payment identity. Mongo owns flexible article metadata, vector arrays, and usage documents. Tags and revision data are bounded and read with the article, so embedding is natural. SQL author IDs are references because duplicating user profiles causes stale identity information.

There is no distributed transaction or foreign key across PostgreSQL and Mongo. Article writes use the authenticated user; deleting users is not exposed. Future account deletion requires an explicit cross-store cleanup policy.

## Normalization and indexes

User and Service facts are not repeated in Booking. Booking references them by FK (3NF). `amountPaise` is an intentional historical price snapshot, not an accidental duplicate. Payment is one-to-one with Booking. Events and attachments are separate one-to-many relations.

Booking indexes on `(userId, createdAt)` and `(status, updatedAt)` support customer history and reminder selection. Mongo has `(tags, updatedAt)` and a title/text search index. Indexes speed reads but cost disk and write work. Vector retrieval is exact cosine ranking over at most 500 stored vectors: suitable for this small project, not an ANN index or large-scale vector database.

## Consistency

Payment confirmation and event insert run in a database transaction. An update guarded by `status=CREATED` handles concurrent duplicate capture events. Booking state updates use compare-and-swap: if the old state changes, return 409 instead of silently overwriting. A unique reminder dedupe key prevents duplicate timeline records. Redis stores only derived/public data or short-lived login state; PostgreSQL remains authoritative.

## Security boundaries

Untrusted input passes strict Zod schemas. Prisma uses parameterized queries, including the report's tagged raw SQL; Mongo selectors are constructed by the server. React escapes text and does not render user HTML. Injection protection is validation + safe APIs + contextual escaping, not a universal string replacement.

JWTs carry only a subject and standard claims; server loads the current role from SQL. HttpOnly cookies reduce token exposure to browser JS, SameSite=Lax and exact Origin checks protect mutations. Bearer callers use explicit tokens. Webhook raw-body HMAC authenticates provider callbacks. File paths are generated on the server and downloads recheck ownership. Rate limiting is per process and must be replaced with a distributed store for multi-instance production.

Prompt instructions, schemas and tool authorization are separate layers. Retrieved text is untrusted. Tools have no mutation capabilities and never accept a model-chosen user ID. Prompt-only defenses cannot guarantee that every answer is safe; evaluation and human review remain necessary.

## Deployment and scaling trade-offs

One long-lived Node process serves both frontend and backend, avoiding CORS/cross-site-cookie complexity. Persistent local disk stores uploads. Managed PostgreSQL, MongoDB and Redis are required. TLS terminates at the hosting proxy. `TRUST_PROXY=1` is suitable only for a known one-hop proxy.

For multiple replicas, use object storage, a Socket.IO Redis adapter, shared rate limits, and a separate job worker with scheduling locks. A transactional outbox would make status notifications reliable across crashes; currently a reconnect/refetch recovers state but an event can be missed between commit and emit. Backups, restore drills, observability, and payment reconciliation are future production work.

The Docker and hosted deployment recipes are separate from proof they have run. See VERIFICATION.md for measured results.
