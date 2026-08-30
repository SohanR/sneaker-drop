# Phase 3 API

## Buyer sessions

`POST /api/v1/sessions` accepts a display username and sets a signed, HttpOnly buyer-session cookie. `GET /api/v1/sessions/current` verifies that cookie. Browser requests must include credentials.

Display usernames are 3–50 characters and may contain letters, numbers, `_`, `.`, and `-`.

## Administrator flow

1. Run `npm run db:seed` once in development.
2. Call `POST /api/v1/admin/login` with the seeded username and password.
3. Copy `data.accessToken` into Swagger's **Authorize** dialog as a bearer token.
4. Call `POST /api/v1/drops` to create a drop.

JWTs are short-lived. Production session and JWT secrets must each contain at least 32 characters.

## Dashboard reads

`GET /api/v1/drops` returns up to 50 drops ordered by start time. Every row includes the database server time, stock version, and up to three latest completed purchasers.

Before reading, the API expires a bounded batch of overdue pending reservations. It locks candidates with `FOR UPDATE SKIP LOCKED`, restores inventory, advances the stock version, and writes durable recovery events in the same PostgreSQL transaction.
