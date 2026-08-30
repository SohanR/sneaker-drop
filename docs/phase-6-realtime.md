# Phase 6 Realtime Delivery

## Deployment constraint

The Socket.IO service must run as exactly one persistent Render/Railway instance. Redis is intentionally not used. Do not configure horizontal replicas: separate socket processes would have separate client sets, while an outbox row is claimed by only one relay.

The API remains stateless and horizontally scalable because it only writes PostgreSQL state and outbox rows.

## Connection flow

1. The browser creates or restores its signed buyer session.
2. It calls `POST /api/v1/realtime/token` with credentials enabled.
3. It connects to `VITE_SOCKET_URL` with the returned JWT in `auth.token`.
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
