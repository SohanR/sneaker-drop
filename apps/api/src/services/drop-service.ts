import { QueryTypes, type Transaction } from "sequelize";
import { getDatabase } from "../config/database.js";
import { getModels } from "../database/models.js";

export interface CreateDropInput {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
  totalStock: number;
  startsAt: Date;
}

export async function createDrop(input: CreateDropInput, adminId: string) {
  const database = getDatabase();
  const { Drop, EventOutbox } = getModels();
  return database.transaction(async (transaction) => {
    const drop = await Drop.create({
      ...input,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      price: input.price.toFixed(2),
      availableStock: input.totalStock,
      createdBy: adminId
    }, { transaction });
    await EventOutbox.create({
      aggregateType: "DROP",
      aggregateId: drop.id,
      eventType: "DROP_CREATED",
      stockVersion: drop.stockVersion,
      payload: { dropId: drop.id, availableStock: drop.availableStock, startsAt: drop.startsAt.toISOString() }
    }, { transaction });
    return drop;
  });
}

export async function expireOverdueReservations(limit = 100, transaction?: Transaction) {
  const database = getDatabase();
  const [result] = await database.query<{ expired_count: string }>(`
    WITH candidates AS (
      SELECT id FROM reservations
      WHERE status = 'PENDING' AND expires_at <= NOW()
      ORDER BY expires_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT :limit
    ), expired AS (
      UPDATE reservations r
      SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
      FROM candidates c
      WHERE r.id = c.id AND r.status = 'PENDING'
      RETURNING r.id, r.drop_id
    ), recovered AS (
      SELECT drop_id, COUNT(*)::integer AS quantity FROM expired GROUP BY drop_id
    ), updated_drops AS (
      UPDATE drops d
      SET available_stock = d.available_stock + recovered.quantity,
          stock_version = d.stock_version + recovered.quantity,
          updated_at = NOW()
      FROM recovered
      WHERE d.id = recovered.drop_id
      RETURNING d.id, d.available_stock, d.stock_version, recovered.quantity
    ), events AS (
      INSERT INTO event_outbox
        (event_id, aggregate_type, aggregate_id, event_type, payload, stock_version, occurred_at, attempt_count, next_attempt_at, created_at, updated_at)
      SELECT gen_random_uuid(), 'DROP', id, 'INVENTORY_RECOVERED',
        jsonb_build_object('dropId', id, 'availableStock', available_stock, 'recoveredQuantity', quantity),
        stock_version, NOW(), 0, NOW(), NOW(), NOW()
      FROM updated_drops
      RETURNING id
    )
    SELECT COUNT(*)::text AS expired_count FROM expired
  `, { replacements: { limit }, type: QueryTypes.SELECT, transaction });
  return Number(result?.expired_count || 0);
}

export interface DashboardDropRow {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  currency: string;
  totalStock: number;
  availableStock: number;
  startsAt: Date;
  stockVersion: string;
  serverTime: Date;
  recentPurchasers: Array<{ displayUsername: string; completedAt: string }>;
}

export async function listDashboardDrops() {
  return getDatabase().transaction(async (transaction) => {
    await expireOverdueReservations(100, transaction);
    return getDatabase().query<DashboardDropRow>(`
    SELECT d.id, d.name, d.description, d.image_url AS "imageUrl", d.price, d.currency,
      d.total_stock AS "totalStock", d.available_stock AS "availableStock",
      d.starts_at AS "startsAt", d.stock_version AS "stockVersion", NOW() AS "serverTime",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'displayUsername', activity.display_username_snapshot,
          'completedAt', activity.completed_at
        ) ORDER BY activity.completed_at DESC)
        FROM (
          SELECT display_username_snapshot, completed_at FROM reservations
          WHERE drop_id = d.id AND status = 'COMPLETED'
          ORDER BY completed_at DESC LIMIT 3
        ) activity
      ), '[]'::jsonb) AS "recentPurchasers"
    FROM drops d
    ORDER BY d.starts_at ASC, d.created_at ASC
    LIMIT 50
    `, { type: QueryTypes.SELECT, transaction });
  });
}
