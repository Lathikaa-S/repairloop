# Concept Evidence Map — all 63 concepts

Source: the assessment rubric supplied for this project. Mandatory/optional labels and points are transcribed from it. Code presence is not proof of external deployment or successful provider integration. Read VERIFICATION.md for actual checks.

Mandatory: 25 concepts. Mandatory points: 4.6. Total listed points: 15.7 (not a predicted awarded score).

| # | Concept | Required | Points | Evidence | Status |
|---|---|---|---|---|---|
| 1 | React component composition | Mandatory | 0.2 | [client/App.jsx](client/App.jsx) | Implemented; local tests/demo evidence |
| 2 | State management with useState | Mandatory | 0.2 | [client/App.jsx](client/App.jsx) | Implemented; local tests/demo evidence |
| 3 | Side effects with useEffect | Mandatory | 0.2 | [client/App.jsx](client/App.jsx) | Implemented; local tests/demo evidence |
| 4 | Async data fetching from API | Mandatory | 0.2 | [client/api.js](client/api.js) | Implemented; local tests/demo evidence |
| 5 | Loading & error UI states | Optional | 0.2 | [client/App.jsx](client/App.jsx) | Implemented; local tests/demo evidence |
| 6 | Form handling — controlled inputs | Optional | 0.2 | [client/App.jsx](client/App.jsx) | Implemented; local tests/demo evidence |
| 7 | Form validation | Optional | 0.2 | [client/App.jsx](client/App.jsx) | Implemented; local tests/demo evidence |
| 8 | Client-side routing | Mandatory | 0.2 | [client/App.jsx](client/App.jsx) | Implemented; local tests/demo evidence |
| 9 | Responsive layout & styling competence | Optional | 0.2 | [client/styles.css](client/styles.css) | Implemented; local tests/demo evidence |
| 10 | Frontend deployment | Optional | 0.2 | [render.yaml](render.yaml) | Deployment recipe; public hosting not verified |
| 11 | Problem modeling | Mandatory | 0.2 | [PRD.md](PRD.md) | Implemented; local tests/demo evidence |
| 12 | System design basics: Frontend, backend, DB and other systems integration | Mandatory | 0.2 | [HLD.md](HLD.md) | Implemented; local tests/demo evidence |
| 13 | RESTful endpoint design | Mandatory | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 14 | HTTP status codes used correctly | Mandatory | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 15 | Request body validation | Optional | 0.2 | [server/security.js](server/security.js) | Implemented; local tests/demo evidence |
| 16 | Server-side error handling | Mandatory | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 17 | Middleware | Mandatory | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 18 | File upload handling | Optional | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 19 | Backend deployment | Optional | 0.2 | [render.yaml](render.yaml) | Deployment recipe; public hosting not verified |
| 20 | Schema modeling (Mongo) | Mandatory | 0.2 | [server/knowledge.js](server/knowledge.js) | Implemented; local tests/demo evidence |
| 21 | CRUD operations (Mongo) | Mandatory | 0.2 | [server/knowledge.js](server/knowledge.js) | Implemented; local tests/demo evidence |
| 22 | Embedding vs referencing relationships | Optional | 0.2 | [server/knowledge.js](server/knowledge.js) | Implemented; local tests/demo evidence |
| 23 | Aggregation pipelines | Optional | 0.2 | [server/knowledge.js](server/knowledge.js) | Implemented; local tests/demo evidence |
| 24 | Indexing for query performance (Mongo) | Optional | 0.2 | [server/knowledge.js](server/knowledge.js) | Implemented; local tests/demo evidence |
| 25 | Relational schema design with PK/FK | Mandatory | 0.2 | [prisma/schema.prisma](prisma/schema.prisma) | Implemented; local tests/demo evidence |
| 26 | SQL JOINs | Mandatory | 0.2 | [server/store.js](server/store.js) | Implemented; local tests/demo evidence |
| 27 | Indexing for query performance (SQL) | Optional | 0.2 | [prisma/schema.prisma](prisma/schema.prisma) | Implemented; local tests/demo evidence |
| 28 | Filtering, ordering, grouping | Optional | 0.2 | [server/store.js](server/store.js) | Implemented; local tests/demo evidence |
| 29 | Normalization basics | Optional | 0.2 | [prisma/schema.prisma](prisma/schema.prisma) | Implemented; local tests/demo evidence |
| 30 | ORM usage (Prisma/Sequelize) | Optional | 0.2 | [server/store.js](server/store.js) | Implemented; local tests/demo evidence |
| 31 | Transactions | Optional | 0.2 | [server/store.js](server/store.js) | Implemented; local tests/demo evidence |
| 32 | Password hashing | Optional | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 33 | JWT issuance & verification | Optional | 0.2 | [server/security.js](server/security.js) | Implemented; local tests/demo evidence |
| 34 | Role-based authorization checks | Optional | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 35 | OAuth / 3rd-party login | Optional | 0.2 | [server/oauth.js](server/oauth.js) | Implemented; Google credentials and live login required |
| 36 | Input sanitization & injection awareness | Optional | 0.2 | [server/security.js](server/security.js) | Implemented; local tests/demo evidence |
| 37 | Rate limiting | Optional | 0.2 | [server/app.js](server/app.js) | Implemented; local tests/demo evidence |
| 38 | LLM API integration | Mandatory | 0.2 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 39 | Prompt engineering | Mandatory | 0.2 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 40 | Structured outputs | Mandatory | 0.2 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 41 | Streaming responses | Optional | 0.3 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 42 | Function calling / tool use | Optional | 0.3 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 43 | RAG — embeddings & vector retrieval | Optional | 0.5 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 44 | LLM eval sets | Optional | 0.5 | [tests/ai-evals.json](tests/ai-evals.json) | Implemented; live provider/index/eval verification required |
| 45 | Prompt injection awareness & defenses | Optional | 0.3 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 46 | Token & cost monitoring | Optional | 0.3 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 47 | Multi-step agent | Optional | 1 | [server/ai.js](server/ai.js) | Implemented; live provider/index/eval verification required |
| 48 | Git workflow | Mandatory | 0.3 | [.github/workflows/ci.yml](.github/workflows/ci.yml) | Implemented; local tests/demo evidence |
| 49 | Environment variables & secrets management | Mandatory | 0.2 | [.env.example](.env.example) | Implemented; local tests/demo evidence |
| 50 | Writing unit tests | Optional | 0.3 | [tests/security.test.js](tests/security.test.js) | Implemented; local tests/demo evidence |
| 51 | Containerization with Docker | Optional | 0.5 | [Dockerfile](Dockerfile) | Docker recipe; see CI and verification report |
| 52 | Automated API testing / integration tests | Optional | 0.2 | [tests/integration.test.js](tests/integration.test.js) | Implemented; local tests/demo evidence |
| 53 | Caching with Redis | Optional | 0.4 | [server/cache.js](server/cache.js) | Implemented; local tests/demo evidence |
| 54 | WebSocket / real-time communication | Optional | 0.5 | [server/index.js](server/index.js) | Implemented; local tests/demo evidence |
| 55 | Scheduled jobs / cron | Optional | 0.3 | [server/index.js](server/index.js) | Implemented; local tests/demo evidence |
| 56 | Server-side rendering | Optional | 0.5 | [client/entry-server.jsx](client/entry-server.jsx) | Implemented; local tests/demo evidence |
| 57 | Payment gateway integration | Optional | 0.5 | [server/payments.js](server/payments.js) | Implemented; mock/signature tests; provider test checkout required |
| 58 | 3rd-party API integration | Optional | 0.3 | [server/payments.js](server/payments.js) | Implemented; mock/signature tests; provider test checkout required |
| 59 | JavaScript — Event loop | Mandatory | 0.1 | [client/js-lab.js](client/js-lab.js) | Implemented; local tests/demo evidence |
| 60 | JavaScript — Promises vs callbacks | Mandatory | 0.1 | [client/js-lab.js](client/js-lab.js) | Implemented; local tests/demo evidence |
| 61 | JavaScript — async/await | Mandatory | 0.1 | [client/api.js](client/api.js) | Implemented; local tests/demo evidence |
| 62 | JavaScript — Closures | Mandatory | 0.1 | [client/api.js](client/api.js) | Implemented; local tests/demo evidence |
| 63 | JavaScript — Hoisting | Mandatory | 0.1 | [client/js-lab.js](client/js-lab.js) | Implemented; local tests/demo evidence |

## Demonstrate and explain

### 1. React component composition

**Demonstration:** Compose Field/Button/Notice into Login and Repairs; change one shared component.

**Be ready to explain:** Why is composition preferable to duplicating each form control?

### 2. State management with useState

**Demonstration:** Type in the booking form and see state-controlled values.

**Be ready to explain:** Why must React state updates use setters?

### 3. Side effects with useEffect

**Demonstration:** Open My repairs; observe socket subscription and its cleanup return.

**Be ready to explain:** What happens if the effect never disconnects its socket?

### 4. Async data fetching from API

**Demonstration:** Create a booking and inspect the fetch request and status check.

**Be ready to explain:** Why does fetch require checking response.ok?

### 5. Loading & error UI states

**Demonstration:** Submit a wrong login and observe busy/error feedback.

**Be ready to explain:** How do loading, empty and error states differ?

### 6. Form handling — controlled inputs

**Demonstration:** Trace form values from onChange to the submit payload.

**Be ready to explain:** What makes an input controlled?

### 7. Form validation

**Demonstration:** Submit a short issue; inspect minLength and server 422 validation.

**Be ready to explain:** Why is browser validation insufficient?

### 8. Client-side routing

**Demonstration:** Navigate Overview → My repairs → Care guides without full reload.

**Be ready to explain:** Why does SSR still need server route handling?

### 9. Responsive layout & styling competence

**Demonstration:** Resize to phone/tablet/desktop and inspect grids and navigation.

**Be ready to explain:** How do breakpoints affect layout without hiding essential actions?

### 10. Frontend deployment

**Demonstration:** Build browser assets, serve them through Express; then deploy and record URL.

**Be ready to explain:** What evidence proves deployment beyond a configuration file?

### 11. Problem modeling

**Demonstration:** Trace user problems to booking/payment/status acceptance criteria.

**Be ready to explain:** Why is the booking fee separate from a final parts quote?

### 12. System design basics: Frontend, backend, DB and other systems integration

**Demonstration:** Follow browser → Express → SQL/Mongo/Redis and external providers.

**Be ready to explain:** Why are responsibilities split across these components?

### 13. RESTful endpoint design

**Demonstration:** Inspect resource-oriented GET/POST/PATCH/PUT/DELETE routes.

**Be ready to explain:** Why is a status update PATCH and article replacement PUT?

### 14. HTTP status codes used correctly

**Demonstration:** Trigger 401, 403, 404, 409, 413, 415 and 422 responses.

**Be ready to explain:** Why should missing authentication differ from insufficient permission?

### 15. Request body validation

**Demonstration:** Attempt to add amountPaise or role to a strict input object.

**Be ready to explain:** How does rejecting unknown fields prevent mass assignment?

### 16. Server-side error handling

**Demonstration:** Follow the centralized error middleware and request ID.

**Be ready to explain:** What should be logged versus returned to a customer?

### 17. Middleware

**Demonstration:** Trace request ID → parser → Origin check → auth → staff middleware.

**Be ready to explain:** Why does middleware order matter for webhooks and uploads?

### 18. File upload handling

**Demonstration:** Upload PNG/JPEG, reject SVG/oversize, test protected download.

**Be ready to explain:** Why check bytes, randomize names and authorize downloads?

### 19. Backend deployment

**Demonstration:** Run production entrypoint and health checks; deploy with secrets and persistent disk.

**Be ready to explain:** Why is a long-lived Node host needed for this design?

### 20. Schema modeling (Mongo)

**Demonstration:** Inspect Article and Usage schemas and bounded metadata.

**Be ready to explain:** What validation belongs in Mongoose versus the route schema?

### 21. CRUD operations (Mongo)

**Demonstration:** Staff creates, reads, edits and deletes a care guide.

**Be ready to explain:** How are missing IDs and invalid document IDs handled?

### 22. Embedding vs referencing relationships

**Demonstration:** Compare embedded tags/revision with referenced SQL authorId.

**Be ready to explain:** What is lost when a reference crosses databases?

### 23. Aggregation pipelines

**Demonstration:** Inspect tag $unwind → $group → $sort and usage grouping.

**Be ready to explain:** How does unwinding change the number of pipeline records?

### 24. Indexing for query performance (Mongo)

**Demonstration:** Inspect compound and text indexes; explain an actual query plan.

**Be ready to explain:** What is the write/storage cost of each index?

### 25. Relational schema design with PK/FK

**Demonstration:** Trace User → Booking → Service and one-to-one Payment.

**Be ready to explain:** How do PK, FK and unique constraints differ?

### 26. SQL JOINs

**Demonstration:** Run report() and inspect LEFT JOIN Service/Booking/Payment.

**Be ready to explain:** Why keep services with zero bookings in the report?

### 27. Indexing for query performance (SQL)

**Demonstration:** Inspect userId/createdAt and status/updatedAt indexes.

**Be ready to explain:** Why does column order in a compound index matter?

### 28. Filtering, ordering, grouping

**Demonstration:** Trace cancellation filter, GROUP BY service and ORDER BY bookings.

**Be ready to explain:** How do WHERE and GROUP BY affect the report?

### 29. Normalization basics

**Demonstration:** Explain separate User, Service, Booking, Payment and Event tables.

**Be ready to explain:** Why is amountPaise an intentional snapshot rather than bad duplication?

### 30. ORM usage (Prisma/Sequelize)

**Demonstration:** Trace Prisma create/findMany/include/$transaction calls.

**Be ready to explain:** What does an ORM simplify and what SQL knowledge is still needed?

### 31. Transactions

**Demonstration:** Run duplicate payment integration test and inspect atomic event write.

**Be ready to explain:** What happens if event insertion fails halfway through the transaction?

### 32. Password hashing

**Demonstration:** Trace bcrypt hash on register and compare on login.

**Be ready to explain:** Why can a password hash not be used as encryption?

### 33. JWT issuance & verification

**Demonstration:** Inspect sign/verify issuer, audience, expiry and allowed algorithm.

**Be ready to explain:** Why reload the user role instead of trusting a client role?

### 34. Role-based authorization checks

**Demonstration:** Customer attempts staff status update and receives 403.

**Be ready to explain:** Why is hiding the technician page not authorization?

### 35. OAuth / 3rd-party login

**Demonstration:** Configure Google callback, inspect state/cache/code exchange and verified profile.

**Be ready to explain:** Why refuse automatic password-account linking by email?

### 36. Input sanitization & injection awareness

**Demonstration:** Reject Mongo operator objects; inspect parameterized SQL and React escaping.

**Be ready to explain:** Why is sanitization context-specific rather than stripping all punctuation?

### 37. Rate limiting

**Demonstration:** Inspect API, login and assistant rate-limit policies.

**Be ready to explain:** What changes when the app runs on multiple replicas?

### 38. LLM API integration

**Demonstration:** Configure API key; call Responses and handle provider failure.

**Be ready to explain:** Why must API keys stay on the server?

### 39. Prompt engineering

**Demonstration:** Inspect SYSTEM, user content and retrieved-context boundaries.

**Be ready to explain:** Why separate instructions from untrusted evidence?

### 40. Structured outputs

**Demonstration:** Inspect strict JSON schema and final Zod validation.

**Be ready to explain:** Does valid JSON establish a correct answer?

### 41. Streaming responses

**Demonstration:** Observe actual provider text deltas through SSE and final validated object.

**Be ready to explain:** Why can network chunks split an SSE event?

### 42. Function calling / tool use

**Demonstration:** Trigger guide lookup and own-booking lookup with strict tool arguments.

**Be ready to explain:** Why should the model never supply the authorization identity?

### 43. RAG — embeddings & vector retrieval

**Demonstration:** Run ai:index, embed a query and rank compatible Mongo vectors by cosine.

**Be ready to explain:** Why is this exact scan not a scalable ANN index?

### 44. LLM eval sets

**Demonstration:** Run ai:eval and review safety/privacy/quality cases and failures.

**Be ready to explain:** Why are keyword checks insufficient for a complete LLM evaluation?

### 45. Prompt injection awareness & defenses

**Demonstration:** Try instruction override requests and inspect read-only tool limits.

**Be ready to explain:** Which defenses remain effective if the model follows malicious text?

### 46. Token & cost monitoring

**Demonstration:** Inspect per-call usage logs, null unknown prices and staff totals.

**Be ready to explain:** Why can estimated cost differ from the provider invoice?

### 47. Multi-step agent

**Demonstration:** Trace up to three model/tool iterations followed by structured streaming.

**Be ready to explain:** Why bound steps and tool counts even for read-only agents?

### 48. Git workflow

**Demonstration:** Inspect commits, branch workflow and the CI run for this repository.

**Be ready to explain:** How would you isolate a change and review it before merging?

### 49. Environment variables & secrets management

**Demonstration:** Copy placeholders locally; inspect gitignore and production guards.

**Be ready to explain:** What do you do if a real secret is accidentally committed?

### 50. Writing unit tests

**Demonstration:** Run deterministic tests for signatures, schemas, ownership and JS ordering.

**Be ready to explain:** What makes a test useful beyond mirroring the code?

### 51. Containerization with Docker

**Demonstration:** Build multi-stage image; run Compose app and health-checked dependencies.

**Be ready to explain:** How do image layers, volumes and environment variables differ?

### 52. Automated API testing / integration tests

**Demonstration:** Run HTTP tests plus real SQL/Mongo/Redis integration tests.

**Be ready to explain:** Which failures can a mock adapter hide?

### 53. Caching with Redis

**Demonstration:** Observe catalog MISS then HIT and Redis expiry test.

**Be ready to explain:** What can become stale and how is its lifetime bounded?

### 54. WebSocket / real-time communication

**Demonstration:** Use customer/staff sessions; update repair and observe live refetch.

**Be ready to explain:** Why are socket rooms assigned by the server?

### 55. Scheduled jobs / cron

**Demonstration:** Age a READY booking in a test; run reminders twice with one event.

**Be ready to explain:** How do idempotency and scheduling differ?

### 56. Server-side rendering

**Demonstration:** Fetch raw HTML and find service titles before JS executes.

**Be ready to explain:** How does hydration differ from rendering a client-only app?

### 57. Payment gateway integration

**Demonstration:** Create Razorpay test order, checkout, capture verify, and signed webhook.

**Be ready to explain:** Why is the browser callback alone not trustworthy evidence of payment?

### 58. 3rd-party API integration

**Demonstration:** Trace authenticated Razorpay HTTP requests, timeout and error mapping.

**Be ready to explain:** What should happen when an upstream service is unavailable?

### 59. JavaScript — Event loop

**Demonstration:** Run Learning lab and predict sync → microtask → timer order.

**Be ready to explain:** Why does setTimeout(...,0) not run immediately?

### 60. JavaScript — Promises vs callbacks

**Demonstration:** Wrap a callback with a Promise; await success and reject failure.

**Be ready to explain:** What does a Promise standardize that a callback does not?

### 61. JavaScript — async/await

**Demonstration:** Trace async fetch → response validation → parsed result → UI update.

**Be ready to explain:** Where should rejected promises be caught?

### 62. JavaScript — Closures

**Demonstration:** Inspect checkout-loader closure and independent counter tests.

**Be ready to explain:** Which variables survive after the outer function returns?

### 63. JavaScript — Hoisting

**Demonstration:** Run function-declaration, var and let temporal-dead-zone examples.

**Be ready to explain:** Why does hoisting not mean all variables are safe to read early?
