# Architecture Decisions

## Runtime ownership

- Vercel serves the React application, stateless Express API, cron, and Socket.IO WebSocket Function.
- Neon PostgreSQL will own inventory truth, temporal truth, transactions, and the durable event outbox.
- The official Socket.IO PostgreSQL adapter distributes broadcasts between active Vercel Function instances.
- Redis is intentionally out of scope; WebSocket clients reconnect at the Vercel Function duration boundary.

## API conventions

- Business endpoints are versioned under `/api/v1`.
- Errors use `{ error: { code, message, requestId, details? } }`.
- Every HTTP response carries `x-request-id`.
- Mutating operations will accept explicit idempotency keys.
- Dates are ISO 8601 strings; PostgreSQL `TIMESTAMPTZ` and `NOW()` are authoritative.

## Reliability boundary

API request handlers do not emit authoritative state directly to Socket.IO. A state mutation and its outbox event commit in one database transaction. A relay claims each event and emits through the PostgreSQL Socket.IO adapter, which reaches clients across active Vercel instances. Delivery is at-least-once, so events carry unique IDs and monotonic stock versions for client deduplication and API reconciliation after reconnects.

## Schema management

All database changes will use reviewed Sequelize migrations. Application startup must never call `sync({ force: true })` or use model synchronization as a deployment mechanism.
