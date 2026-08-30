# Phase 4 Atomic Reservations

## API contract

`POST /api/v1/drops/:dropId/reservations` reserves one unit. It requires:

- A valid signed buyer-session cookie.
- An `Idempotency-Key` header containing a UUID.
- A drop whose PostgreSQL `starts_at` is not in the future.
- At least one available unit.

A new hold returns HTTP `201`; replaying the same buyer/key pair returns HTTP `200` without decrementing stock again. Reusing that key for another drop returns `409 IDEMPOTENCY_KEY_REUSED`.

## Concurrency boundary

The transaction starts with a PostgreSQL conditional update using `available_stock > 0` and `starts_at <= NOW()`. A data-modifying CTE then inserts the pending reservation and `RESERVATION_CREATED` outbox event from the updated row. If any insert fails, the stock update rolls back.

The reservation expiry is calculated by PostgreSQL as `NOW() + 60 seconds`; browser or API-host clocks never determine whether the hold exists.

## Expected conflicts

- `DROP_NOT_FOUND`: unknown UUID.
- `DROP_NOT_STARTED`: PostgreSQL time is earlier than `starts_at`.
- `SOLD_OUT`: the conditional stock update changed zero rows because no units remain.
- `IDEMPOTENCY_KEY_REUSED`: the buyer already used the key for a different drop.
