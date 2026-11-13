# Deploy frontend and backend together

## Why one web service?

Express serves the built browser bundle, server-rendered public pages, APIs, SSE and Socket.IO from one origin. Both frontend and backend are deployed by the same release. This is intentional; hosting only `dist/client` on a static host would remove SSR and still require an API/WebSocket backend.

## Hosting prerequisites

- A host supporting a long-running Node 22 process, HTTPS, WebSockets, and streaming responses.
- PostgreSQL, MongoDB and Redis URLs with appropriate credentials/TLS.
- Persistent storage mounted at the app's `uploads/` path.
- Your own provider secrets for optional external integrations.

The supplied Render blueprint is a deployment recipe, not a deployed URL. Its persistent disk/pre-deploy features may require a paid hosting plan; confirm current plan capabilities before purchasing. No paid resource is automatically provisioned by this repository.

## Release steps

1. Connect the original public GitHub repository to your hosting account.
2. Configure the Node version and build `npm ci && npm run db:generate && npm run build`.
3. Configure secrets from `.env.example`. Set `APP_MODE=live`, `NODE_ENV=production`, and `APP_URL` to the exact HTTPS public origin without a trailing slash.
4. Set `DATABASE_URL`, `MONGODB_URI`, `REDIS_URL`, and a random `JWT_SECRET`.
5. Run `npm run db:migrate` as a pre-deploy/release command.
6. Run `npm run db:seed` once with your chosen admin password, then remove that seed password from routine runtime configuration.
7. Start with `npm start`; the host injects `PORT`. Health check is `/api/health`.
8. Configure Google redirect URI and Razorpay webhook to the new HTTPS origin.
9. Run `npm run ai:index` using the same Mongo database if enabling retrieval.

Official hosting reference: [Deploy an Express application on Render](https://render.com/docs/deploy-node-express-app). `render.yaml` supplies project-specific commands and environment keys.

## Deployment evidence checklist

- Record the public URL and Git commit SHA in VERIFICATION.md.
- Fetch `/` with curl: service names should already exist in HTML (SSR).
- Load a nested route directly and refresh it.
- Register/sign in and verify Secure/HttpOnly/SameSite cookie attributes.
- Complete a booking and upload; restart the service and check persistence.
- Use two browsers to verify authenticated repair-status updates.
- Run Razorpay Test Mode checkout and capture/webhook verification.
- Verify Google login and live LLM response, retrieval, and usage records.
- Check `/api/health`, logs, and recovery when one dependency is unavailable.

Do not claim frontend/backend deployment points solely because this file exists. A running local production build proves packaging and server behavior, not public deployment.

## Operational limitations

Use one replica in this version. Multiple instances need shared rate limiting, Socket.IO coordination, object storage, and a dedicated scheduler. Back up PostgreSQL/Mongo/uploads and test restores. The current payment model has no refund/reconciliation operator UI. JWT logout clears the cookie but does not revoke a copied token before its two-hour expiry. A crash after transaction commit can lose a socket notification; refresh recovers persisted state.
