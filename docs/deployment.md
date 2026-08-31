# Deploy everything to Vercel

Production URL: `https://limited-sneaker-drop.vercel.app`

The Vite frontend, Express API, expiration cron, and Socket.IO WebSocket endpoint deploy in one Vercel project. Neon PostgreSQL provides inventory truth, the durable outbox, and cross-instance Socket.IO broadcasting. Redis is not used.

Vercel WebSockets are currently a Public Beta feature. Connections follow Function duration limits, so the browser reconnects automatically and refreshes canonical inventory after reconnecting.

## 1. Rotate exposed local credentials

The earlier Neon password and session secret that appeared in `.env.example` must be considered compromised. Rotate the Neon database password and generate fresh independent production secrets before deployment. Keep real values only in local `.env` and Vercel's encrypted Environment Variables settings.

## 2. Prepare Neon

Use the pooled Neon URL for application traffic and the direct URL for migrations:

```env
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
DATABASE_MIGRATION_URL=postgresql://.../neondb?sslmode=require
```

Run locally with the production database URLs configured:

```bash
npm run db:migrate
npm run db:migrate:status
```

All six migrations must show `up`, including `create-socket-io-attachments`. Migrations never run during Vercel startup.

If an administrator is not present, set strong temporary `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD` values locally, run `npm run db:seed`, then remove those values.

## 3. Create the Vercel project

1. In Vercel, choose **Add New > Project** and import `SohanR/sneaker-drop`.
2. Set the project name to `limited-sneaker-drop`. The resulting production URL should be `https://limited-sneaker-drop.vercel.app` if that name is available in your account.
3. Keep the project root as the repository root (`./`).
4. Let `vercel.json` supply the build command and output directory.
5. Enable Fluid Compute if the project dashboard presents that option. WebSocket support otherwise requires no code-side toggle.

## 4. Add Vercel environment variables

Add these to **Production** (and Preview only if you intend to test previews):

```env
NODE_ENV=production
DATABASE_URL=<new pooled Neon URL>
DB_SSL=true
DB_LOGGING=false
DB_POOL_MAX=3
DB_POOL_MIN=0
DB_POOL_IDLE_MS=5000
DB_POOL_ACQUIRE_MS=20000
SOCKET_DB_POOL_MAX=3

CORS_ALLOWED_ORIGINS=https://limited-sneaker-drop.vercel.app
SOCKET_ALLOWED_ORIGINS=https://limited-sneaker-drop.vercel.app

SESSION_SECRET=<unique random value, at least 32 characters>
SESSION_TOKEN_PEPPER=<different random value, at least 32 characters>
ADMIN_JWT_SECRET=<different random value, at least 32 characters>
SOCKET_AUTH_SECRET=<different random value, at least 32 characters>
CRON_SECRET=<different random value, at least 32 characters>

SESSION_TTL_SECONDS=604800
SESSION_COOKIE_NAME=sneaker_drop_session
ADMIN_JWT_ISSUER=sneaker-drop-api
ADMIN_JWT_AUDIENCE=sneaker-drop-admin
ADMIN_JWT_EXPIRES_IN_SECONDS=900
SOCKET_TOKEN_ISSUER=sneaker-drop-api
SOCKET_TOKEN_AUDIENCE=sneaker-drop-socket
SOCKET_TOKEN_EXPIRES_IN_SECONDS=300
RESERVATION_TTL_SECONDS=60
SWEEPER_BATCH_SIZE=100
SWEEPER_MAX_BATCHES=10
OUTBOX_BATCH_SIZE=100
OUTBOX_POLL_INTERVAL_MS=250
```

Do not add `DATABASE_MIGRATION_URL`, seed credentials, or local ports to Vercel. Do not set `VITE_API_BASE_URL` or `VITE_SOCKET_URL` in production: the frontend intentionally uses same-origin `/api/v1` and `/socket.io`, which avoids cross-origin browser requests and CORS errors.

## 5. Deploy

Click **Deploy**. The Vercel routes are:

- `/` and SPA paths: Vite frontend
- `/api/v1/*`: Express API
- `/api/docs`: Swagger UI
- `/socket.io/*`: Socket.IO WebSocket Function

The Hobby-compatible manifest uses a 60-second WebSocket function duration and a daily cron. Socket.IO reconnects automatically. Lazy expiration runs during inventory reads, so an open dashboard still restores expired holds at the 60-second boundary. On Vercel Pro, you may change `maxDuration` to `300` and the cron schedule to `* * * * *`.

## 6. Production smoke test

1. Open `https://limited-sneaker-drop.vercel.app/api/v1/health` and expect `200`.
2. Open `https://limited-sneaker-drop.vercel.app/api/docs`.
3. Create a buyer session and confirm the secure `sneaker_drop_session` cookie is set.
4. Confirm the dashboard connection badge becomes **Live**.
5. In browser DevTools, verify the Socket.IO request upgrades with status `101` at `wss://limited-sneaker-drop.vercel.app/socket.io/`.
6. Open two browsers, reserve an item in one, and confirm stock updates in the other.
7. Wait longer than 60 seconds and confirm the WebSocket reconnects and inventory stays correct.
8. Test logout and confirm `/api/v1/sessions/current` then returns `401`.

If the API works but WebSocket upgrade does not, confirm the deployment was created after Vercel's WebSocket Public Beta availability, Fluid Compute is enabled, and no Vercel environment variable overrides `VITE_SOCKET_URL` with an old Render or localhost URL.
