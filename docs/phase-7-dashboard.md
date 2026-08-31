# Phase 7: React dashboard

Phase 7 delivers the buyer-facing dashboard for browsing drops, creating a cookie-backed buyer session, reserving one unit for 60 seconds, and settling an active hold.

## Delivered behavior

- Responsive live-drop cards with price, image fallback, server-aligned start state, stock, and the three most recent purchasers.
- Required display-username onboarding with inline validation and loading feedback.
- Reservation and purchase actions with unique idempotency keys, disabled/loading controls, confirmation dialog, and toast feedback.
- Countdown state aligned to PostgreSQL server timestamps; browser timers only render the countdown and never control authoritative inventory.
- Socket.IO inventory updates with event-ID deduplication, stock-version protection, reconnect refreshes, and an API refresh for activity-feed consistency.
- Empty, loading, API-error, sold-out, pre-start, expired-hold, and completed-purchase states.

## Runtime configuration

Development may set `VITE_API_BASE_URL` and `VITE_SOCKET_URL`. Production defaults to same-origin `/api/v1` and `/socket.io`, avoiding cross-origin requests. Socket.IO uses the PostgreSQL outbox and PostgreSQL adapter; Redis is not used or required.

## Automated verification

Run `npm test` and `npm run typecheck` from the repository root. The project build is intentionally not part of this phase's verification workflow.
