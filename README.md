<div align="center">

# Limited Sneaker Drop

### A real-time, three-tier inventory concurrency simulation

[Live Application](https://limited-sneaker-drop.vercel.app/) · [Swagger API](https://limited-sneaker-drop.vercel.app/api/docs) · [Video Demo](./demo.mp4)

</div>

---

## How to run the app

### Requirements

- Node.js 20 or 22
- npm 10+
- PostgreSQL or a Neon PostgreSQL database

### 1. Clone and install

```bash
git clone https://github.com/SohanR/sneaker-drop.git
cd sneaker-drop
npm install
```

### 2. Configure the environment

Copy the template:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill in the database URLs and application secrets in `.env`. `DATABASE_URL` should use the pooled application connection, while `DATABASE_MIGRATION_URL` should use the direct database connection.

### 3. Create the SQL schema

The database schema is managed exclusively through Sequelize migrations. Application startup never uses `sequelize.sync()` or destructive force synchronization.

```bash
npm run db:migrate
npm run db:migrate:status
```

The migration status should show all migrations as `up`, creating:

- `users`
- `buyer_sessions`
- `drops`
- `reservations`
- `event_outbox`
- `socket_io_attachments`

To create the initial administrator, configure `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD`, then run:

```bash
npm run db:seed
```

### 4. Start development mode

```bash
npm run dev
```

This starts all three workspaces:

- Frontend: [http://localhost:5173](http://localhost:5173)
- API and Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Socket.IO service: [http://localhost:3001/health](http://localhost:3001/health)

---

## Architecture Choice: 60-second expiration

The system uses PostgreSQL time and persisted reservation state as the source of truth. Browser timers only display the remaining time and never decide whether a reservation is valid.

### Tier 1 — Atomic reservation

A reservation starts with one conditional PostgreSQL update:

```sql
UPDATE drops
SET available_stock = available_stock - 1
WHERE id = :drop_id
  AND available_stock > 0
RETURNING *;
```

If the update returns a row, one unit is held and a `PENDING` reservation is created with:

```sql
expires_at = NOW() + INTERVAL '60 seconds'
```

The stock mutation, reservation, and durable outbox event commit in the same database transaction.

### Tier 2 — State-driven expiration and recovery

No in-memory `setTimeout` controls inventory. Expired holds are recovered through two database-driven paths:

1. **Lazy expiration:** dashboard reads detect reservations where `expires_at <= NOW()`, mark them `EXPIRED`, and restore stock atomically.
2. **Background sweep:** an authenticated Vercel Cron endpoint processes overdue reservations in bounded batches using `FOR UPDATE SKIP LOCKED`.

Each reservation can transition out of `PENDING` only once, so repeated reads or cron executions cannot restore the same stock twice. Recovery also writes an outbox event so connected dashboards receive the updated inventory.

### Tier 3 — Pessimistic purchase settlement

Purchase completion locks the reservation row with `SELECT ... FOR UPDATE`. Inside the transaction, the API confirms that the reservation belongs to the buyer, remains `PENDING`, and has not expired according to PostgreSQL `NOW()`.

A valid reservation becomes `COMPLETED`. Stock is not decremented during settlement because it was already deducted when the hold was created. An expired reservation is recovered instead. Idempotency keys make reservation and settlement retries safe.

---

## Concurrency: preventing multiple claims on the last item

Inventory correctness is enforced by PostgreSQL rather than an application-level `if (stock > 0)` check. Concurrent requests targeting the final item all execute the same conditional update against one row.

PostgreSQL serializes those row updates:

1. The first transaction changes stock from `1` to `0` and succeeds.
2. Every competing transaction re-evaluates `available_stock > 0` after obtaining the row lock.
3. The condition is now false, so those updates return zero rows.
4. The API returns `409 Conflict` without creating additional reservations.

Therefore, even if 100 buyers request the final unit simultaneously, exactly one reservation succeeds and inventory never becomes negative. The outbox provides durable at-least-once realtime delivery, stock versions protect ordering, and clients deduplicate events by ID.

---

<div align="center">

Developed and implemented by **[Md Mizanur Rahman](https://mrsohan.netlify.app/)**

</div>
