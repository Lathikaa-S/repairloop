# Product Requirements Document — RepairLoop

## Problem and users

People often replace repairable electronics because diagnosis, pricing and repair progress are unclear. RepairLoop gives customers a single place to request a repair and follow its progress. Technicians need a shared queue, trustworthy payment status, and reusable care guidance.

**Customer:** register/sign in, describe a device issue, select a fixed booking service, attach photos, pay, track progress, read guides, and request AI intake advice.

**Technician/admin:** inspect the queue, move bookings through allowed states, publish/edit/delete guides, and inspect SQL, Mongo and AI usage reports. Public registration always creates a CUSTOMER. Admin creation is an explicit seed operation.

## Functional acceptance criteria

| Feature | Observable acceptance |
|---|---|
| Catalog | Public SSR page contains service descriptions and integer-paise prices before JS runs. |
| Authentication | Valid password signs in; invalid password fails; password hashes and secrets never reach the UI. |
| Booking | Valid form creates REQUESTED booking with server-selected price; invalid/extra fields produce 422. |
| Access control | A customer can read only their own repairs and images; staff-only writes return 403 to customers. |
| Upload | One PNG/JPEG up to 3 MB with matching signature; generated filename; protected download. |
| Payment | Server creates one locally authoritative order; signed captured payments update payment and event atomically. |
| Status | REQUESTED → CONFIRMED → IN_REPAIR → READY → COLLECTED; cancellation only before repair. |
| Real time | Authenticated customer/staff sockets receive an update notification and refetch permitted data. |
| Reminder | READY over 24 hours gets one durable timeline reminder; repeat jobs do not duplicate it. |
| Knowledge | Staff Mongo CRUD; tags/revisions embedded; author ID references SQL; edits invalidate stale vectors. |
| Assistant | Bounded read-only tool loop, structured output validation, streamed provider deltas, usage accounting. |
| Reports | SQL JOIN/grouping revenue report, Mongo tag aggregation, AI usage grouping. |
| Learning | Runnable event loop, hoisting, closure and callback/Promise examples with tests. |

## Product boundaries

Prices are fixed booking fees, not a guaranteed quotation for all eventual parts/labor. The project does not provide appointment slot capacity, shipping, inventory, refunds, automated diagnoses, or email/SMS delivery. Reminders appear in the booking timeline. AI never modifies orders or spends money. Human technicians confirm diagnosis and repair work.

## Nonfunctional requirements

- Responsive customer UI and keyboard-operable labelled forms; errors must be readable.
- Same-origin deployment with TLS in production; HttpOnly/Secure cookies; strict request schemas.
- No sensitive details in generic server error responses. Request IDs support debugging.
- Server-side timeouts for external calls; explicit unconfigured-service errors instead of fake success.
- Repeatable migration/seed flow, committed lockfile, automated checks and container recipe.
- Honest evidence: demo simulation, code implementation and live verification are distinct.

## Assessment coverage

The supplied rubric has 63 concepts; 25 are mandatory (4.6 points) and mandatory completion plus at least 1.4 optional points is described as the threshold. This document records the supplied rubric, not independently verified current institutional policy. All concepts have code/configuration locations and demo instructions in CONCEPTS.md. Marks depend on understanding and assessor decisions. Deployment and credential-backed integrations must be demonstrated live before claiming operational verification.

## Success measures

Measure completed booking/payment/status flows, ownership-check failures, webhook duplicate handling, cache hit rate, and AI evaluation results. No fictional user counts, environmental impact, uptime, or conversion numbers are presented as actual metrics.
