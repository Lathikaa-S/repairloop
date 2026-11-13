# Understand the project before the viva

Use this as a study workbook, not a script for a live proctored assessment. The supplied guide says to use your own explanations and no external help during the viva. Implementation was AI-assisted; change and understand the code before presenting it as your work.

## A practical learning order

1. **Customer flow:** register, login, book, upload, pay in demo, read timeline. Trace each click from React to API to storage and back.
2. **React/JavaScript:** controlled fields, useState, useEffect cleanup, route changes, async requests, closure loader, and Learning lab.
3. **Backend:** middleware order, validation, REST resources, status codes, centralized errors.
4. **SQL:** keys/relations, 3NF, price snapshots, JOIN report, indexes, transactions, concurrent updates.
5. **Mongo:** create/edit/delete guides, embed versus reference, tag aggregation, indexes and vector invalidation.
6. **Security:** password hashing, JWT claims, roles, ownership checks, CSRF, injection boundaries, rate limits.
7. **Integration:** real Redis, sockets, hourly reminders, SSR, Razorpay test flow, OAuth.
8. **AI:** actual provider setup, prompts, structured output, tools, RAG, agent loop, streaming, costs, evaluation.
9. **Engineering:** migration, seed, tests, Git history, Docker, CI, and real deployment evidence.

## Explain one flow deeply

For booking creation, start at `Repairs.submit` in client/App.jsx. Browser validation catches obvious short input. `send` serializes the payload. Express authenticates the cookie, validates a strict schema, looks up the service and uses its price. Prisma inserts booking and initial event. The API returns 201. React refetches the list and displays the booking. Explain why changing the browser's displayed amount cannot change the server price.

For payments, draw the order/callback/webhook sequence from LLD.md. Be ready to explain HMAC, raw-body parsing, captured versus authorized status, duplicate delivery, local atomicity, and the failure between remote order creation and local save. Run the duplicate webhook test and deliberately alter the payload to show rejection.

For real time, open customer and staff sessions in different browsers. Confirm a booking as staff. The server emits a minimal booking ID to authorized rooms, and the customer refetches authorized data. Explain why clients cannot choose arbitrary rooms and why REST remains the source of truth.

For AI, show one real response after indexing. Identify the question embedding, cosine-ranked guide snippets, model-selected tool, server-side identity scope, final JSON schema, SSE delta, and usage record. Explain why neither a prompt nor valid JSON guarantees factual accuracy.

## A strong 1–3 minute explanation

- Name the user feature and concrete input.
- Open the exact function/schema/test from CONCEPTS.md.
- Trace the data and control flow.
- Explain one design decision and its trade-off.
- Demonstrate a failure case and how the system responds.
- State what remains unverified instead of claiming success from code alone.

## Small modifications that prove understanding

1. Add a new service through the seed catalog, migrate nothing, and explain why the schema stays unchanged.
2. Add a new allowed repair transition and update both server state machine and staff UI; add a test for an invalid skip.
3. Change cache TTL, observe MISS/HIT/expiry, and explain staleness.
4. Add a guide tag and inspect the aggregation result.
5. Add an evaluation case that currently fails and explain a measured improvement.
6. Add a report filter using parameterized SQL; never concatenate query strings.

## Preparing attempts

The supplied material describes up to 10 concepts per attempt and a daily/24-hour limit. Check the current dashboard before scheduling. Prioritize all 25 mandatory concepts first; optional high-weight features do not replace them. Do not select an external-integration/deployment concept until you can show its live evidence and explain its failure paths.

## Git workflow to practise

```bash
git switch -c feature/clearer-repair-status
# Make and understand a focused change.
npm test
npm run build
git diff
git add client server tests
git commit -m "Improve repair status feedback"
git push -u origin feature/clearer-repair-status
# Open and review a pull request, inspect CI, then merge when it is correct.
```

Never fabricate historical contributions or claim automated checks prove concepts you cannot explain.
