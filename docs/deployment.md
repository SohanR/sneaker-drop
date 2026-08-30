# Production deployment

The production topology is Vercel for the Vite application and stateless Express API, Neon for PostgreSQL, and one persistent Render Socket.IO service. Redis is intentionally not part of this architecture.

## 1. Neon

1. Create a production database and keep its pooled application URL separate from its direct migration URL.
2. Set `DATABASE_URL` to the pooled URL in Vercel and Render.
3. Set `DATABASE_MIGRATION_URL` to the direct URL only in the trusted migration environment.
4. Run `npm run db:migrate` once per release before routing production traffic. Never run migrations from application startup.
5. Seed an initial administrator only when required, then rotate or remove bootstrap credentials.

## 2. Render Socket.IO relay

Create the service from `render.yaml`. Keep `numInstances` at exactly `1`; this is the Redis-free delivery topology. Configure:

- `DATABASE_URL`
- `SOCKET_AUTH_SECRET`
- `SOCKET_ALLOWED_ORIGINS=https://<vercel-domain>`

The socket secret, issuer, and audience must exactly match their Vercel API values. Verify `GET /health` before deploying the frontend.

## 3. Vercel application and API

Import the repository with the repository root as the project root. `vercel.json` builds `apps/web` and routes `/api/*` to the Express function while serving SPA routes from the Vite output.

Configure all production values listed in `.env.example`. In particular:

- Use independent random values of at least 32 characters for session, pepper, admin JWT, socket JWT, and cron secrets.
- Set `VITE_API_BASE_URL=/api/v1` so cookies remain first-party.
- Set `VITE_SOCKET_URL` to the HTTPS Render service URL.
- Set both CORS origin lists to the exact Vercel application origin.
- Keep API and socket database pools small enough for the Neon connection limit.

Vercel Cron calls the expiration route every minute and supplies `CRON_SECRET` as its bearer credential.

## 4. Release order

1. Back up production data and run reviewed migrations.
2. Deploy or restart the single socket relay and verify its health endpoint.
3. Deploy Vercel and verify API health, Swagger, session cookies, and websocket connection.
4. Create a one-unit test drop and perform the reservation/settlement smoke test.
5. Watch API errors, database connections, outbox retry count, and relay logs during the release window.

## Final-unit concurrency verification

Install k6 separately, create a started drop with exactly one available unit, then run:

```bash
k6 run -e API_URL=https://<app-domain>/api/v1 -e DROP_ID=<drop-uuid> tests/load/final-unit.js
```

The test passes only when one request returns success and the other 99 return conflict. Use a disposable drop because the winner creates a real pending reservation.

## Rollback

Roll application revisions back through Vercel and Render. Database migrations require a reviewed forward-fix or the matching Sequelize undo only when that undo is proven safe for production data. Never force-sync or reset the production database.
