# Phase 5 Expiration and Settlement

## Three-tier concurrency status

1. Atomic conditional stock reservation is implemented by PostgreSQL in Phase 4.
2. Database-time expiration now has both lazy dashboard recovery and an authenticated Vercel cron sweeper.
3. Purchase settlement now locks the reservation with `SELECT ... FOR UPDATE` before checking ownership, status, and expiry.

Redis is not used. Inventory correctness and realtime handoff rely on PostgreSQL, while the Socket.IO relay runs as one persistent instance.

## Expiration cron

Vercel invokes `GET /api/v1/internal/cron/expire-reservations` every minute. It sends `Authorization: Bearer <CRON_SECRET>`. Each invocation processes bounded `FOR UPDATE SKIP LOCKED` batches and reports whether more work may remain.

## Purchase settlement

`POST /api/v1/reservations/:reservationId/complete` requires the owning buyer cookie and a UUID `Idempotency-Key` header.

- A valid pending hold becomes `COMPLETED` and produces `PURCHASE_COMPLETED` without decrementing stock again.
- A request after expiry commits the expiration and stock recovery, then returns `409 RESERVATION_EXPIRED`.
- Repeating a completed request with the same key returns an idempotent replay.
- A different key after completion returns `409 RESERVATION_ALREADY_COMPLETED`.
- Other buyer sessions receive `404 RESERVATION_NOT_FOUND` and cannot infer reservation ownership.
