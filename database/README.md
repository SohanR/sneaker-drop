# Database operations

The schema is owned exclusively by Sequelize migrations. Never add `sequelize.sync()` to application startup.

## Configure

Set `DATABASE_MIGRATION_URL` to a direct/unpooled Neon connection string. For a local PostgreSQL instance, set `DB_SSL=false`.

## Commands

```bash
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:undo
npm run db:seed
npm run db:seed:undo
```

The development seed defaults to `admin/admin`. Production refuses default credentials and requires both `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD`.

Migrations run as a controlled deployment step, not inside request handlers or process startup.
