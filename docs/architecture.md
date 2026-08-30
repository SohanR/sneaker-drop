# Architecture Decisions

## Runtime ownership

- Vercel serves the React application and stateless Express API.
- Neon PostgreSQL will own inventory truth, temporal truth, transactions, and the durable event outbox.
- Render or Railway hosts the persistent Socket.IO relay.
- The Socket.IO relay runs as exactly one persistent instance; Redis and horizontal socket replicas are intentionally out of scope.

## API conventions

- Business endpoints are versioned under `/api/v1`.
- Errors use `{ error: { code, message, requestId, details? } }`.
- Every HTTP response carries `x-request-id`.
- Mutating operations will accept explicit idempotency keys.
- Dates are ISO 8601 strings; PostgreSQL `TIMESTAMPTZ` and `NOW()` are authoritative.

## Reliability boundary

Vercel request handlers do not emit authoritative state directly to Socket.IO. A state mutation and its outbox event will commit in one database transaction. Delivery is at-least-once, so real-time events carry unique IDs and monotonic stock versions for client deduplication and reconciliation.

## Schema management

All database changes will use reviewed Sequelize migrations. Application startup must never call `sync({ force: true })` or use model synchronization as a deployment mechanism.
