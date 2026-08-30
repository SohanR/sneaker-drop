# Phase 8: Release hardening and verification

Phase 8 completes the initial production-readiness scope with deterministic hosting configuration, continuous verification, a final-unit load test, and an operational release guide.

## Acceptance gates

- TypeScript checks and all unit/integration tests pass.
- The frontend production build is exercised by CI; it is intentionally not run as part of the local phase implementation.
- Vercel owns the web/API deployment and minute cron schedule.
- Render runs exactly one persistent Socket.IO instance.
- PostgreSQL remains the only coordination and durability dependency; Redis is absent.
- The k6 test demonstrates exactly one winner for 100 requests targeting the final unit.
