# Setup: from clone to real integrations

## 1. Choose the mode

Use the README demo commands first. For actual persistence, copy `.env.example` to `.env` and set `APP_MODE=live`. “Live” means real adapters; Razorpay can and should still use **test-mode keys** for assessment. The app does not silently fall back to demo when a dependency fails.

Generate a JWT secret locally using `openssl rand -hex 32` and paste it into `.env`. Choose a unique `SEED_ADMIN_PASSWORD` of at least 12 characters. Do not paste real secrets into screenshots, Git commits, or chat.

## 2. Start PostgreSQL, MongoDB and Redis

With working Docker Engine:

```bash
cp .env.example .env            # Edit mode, JWT secret, and admin password before continuing.
docker compose up -d postgres mongo redis
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Without Docker, start installed or managed services and set their connection URLs in `.env`. Use a dedicated database for this project. Default Compose database credentials are for local development only. Mongo and Redis are bound to loopback by Compose; managed/public deployments require provider authentication and TLS.

Seed is repeatable: it upserts catalog entries and creates missing guides/admin. It deliberately does not reset an existing admin's password. Sign in with your configured admin email/password and register a separate customer through the UI.

## 3. Razorpay test checkout

1. Use your own Razorpay dashboard in Test Mode and obtain test key ID and secret.
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`; keep them out of the browser except the public key ID.
3. Set a webhook secret and subscribe a public HTTPS `/api/payments/webhook` endpoint to `payment.captured`. Add the same secret as `RAZORPAY_WEBHOOK_SECRET`.
4. Restart, create a booking as a customer, and choose Pay securely. Use the provider's current documented test payment details.
5. Verify the database payment is PAID and exactly one PAYMENT event exists. Retry a webhook to demonstrate idempotency.
6. Try a forged browser signature and altered amount; they must fail. Test cancellation, provider failure, browser closure and a delayed capture.

The app requires captured status, not just authorization. Configure capture behavior appropriately in your provider account. A local demo “paid” label is not payment-gateway evidence. Do not use real money for the assessment demonstration.

Official references: [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps), [webhook validation/testing](https://razorpay.com/docs/webhooks/validate-test). Webhooks require a reachable supported public endpoint; localhost alone cannot receive them.

## 4. Google login

Create a Google OAuth web client and consent configuration. Set its authorized redirect URI to exactly `${APP_URL}/api/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. In testing mode, add the intended test users. Restart and use Continue with Google.

The code stores state in Redis and an HttpOnly cookie, exchanges the code server-side, and fetches verified user information. An existing password account is not silently linked by email. See [Google's identity documentation](https://developers.google.com/identity/openid-connect/openid-connect) for current account setup requirements.

## 5. OpenAI assistant and retrieval

Set `OPENAI_API_KEY`, a Responses/structured-output-capable `OPENAI_MODEL`, and `EMBEDDING_MODEL`. The example uses `gpt-4.1-mini` and `text-embedding-3-small`; account availability must be checked. Configure current input/output/embedding rates if you need dollar estimates. Otherwise the application reports unknown cost.

```bash
npm run ai:index                # Reads article text, creates embeddings, stores vectors and usage.
npm run ai:eval                 # APP_MODE=live invokes real provider calls.
```

These commands incur provider usage. The indexer skips no articles: reruns regenerate embeddings. When an article changes, its old vector is cleared; rerun indexing before claiming updated retrieval. The retrieval scan is capped at 500 articles and must be replaced for a large corpus.

Ask about a swollen battery, a slow laptop, and your repair status. Inspect tool-call names and usage in the response details, and aggregated usage in Technician desk. Streaming transports actual provider output as SSE; the final result is parsed and validated. Demo streaming is a labelled local example.

Read [Responses function calling](https://developers.openai.com/api/docs/guides/function-calling) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for the provider contracts used here.

## 6. Verify against isolated services

Use dedicated test SQL/Mongo databases and a dedicated Redis instance/database. Migrate first. `npm run test:integration` creates unique test users, bookings and articles and removes those records afterward. It upserts the four catalog services and can execute reminders for READY records in the configured database, so do not point it at customer production data.

```bash
npm test
npm run test:integration
npm run build
npm run check:coverage
npm audit --audit-level=high
```

## 7. Containerized app

`NODE_ENV=production` uses Secure cookies; use HTTPS via a reverse proxy for a fully containerized browser login. For local HTTP learning, run the Node development server against the Compose databases as above.

```bash
docker compose --profile setup run --rm setup
docker compose up -d --build app
docker compose logs -f app
```

The setup job applies migration and seed before the app starts. Ports already used by local services must be changed or those services stopped by their owner. Never delete existing volumes just to resolve a port collision.
