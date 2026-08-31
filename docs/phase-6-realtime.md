# Phase 6 Realtime Delivery

## Vercel deployment model

Socket.IO runs as a Vercel WebSocket Function. Vercel may create multiple bounded-lifetime instances, so the official Socket.IO PostgreSQL adapter fans a relay emission out to clients connected to every active instance. Redis is intentionally not used.

The browser uses WebSocket-only transport, reconnects when Vercel reaches the Function duration limit, and reconciles inventory through the API.

The API remains stateless and horizontally scalable because it only writes PostgreSQL state and outbox rows.

## Connection flow

1. The browser creates or restores its signed buyer session.
2. It calls `POST /api/v1/realtime/token` with credentials enabled.
3. In production it connects to the same-origin `/socket.io` endpoint with the JWT in `auth.token`. A local `VITE_SOCKET_URL` remains available for development.
4. The socket joins the `dashboard` room automatically.
5. Product-specific listeners emit `drop:subscribe` with a drop UUID and check the acknowledgement.

Tokens are short-lived and scoped to the realtime audience. A reconnect after token expiry must request a new token.

## Outbox delivery

The relay locks unpublished rows with `FOR UPDATE SKIP LOCKED`, emits them, and only then marks them published. A crash between emit and commit can produce a duplicate, so delivery is intentionally at-least-once. Clients deduplicate by `eventId`, ignore stock versions older than the currently rendered version, and re-fetch `GET /api/v1/drops` after reconnect.

Events:

- `system:ready`: authenticated connection established.
- `inventory:event`: dashboard-wide state change.
- `drop:event`: event for a subscribed drop room.
- `drop:subscribe` / `drop:unsubscribe`: manage product-specific rooms.

Failed batches are rolled back, increment `attempt_count`, record `last_error`, and retry with exponential backoff capped at five minutes.
