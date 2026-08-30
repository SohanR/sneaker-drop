import { QueryTypes, UniqueConstraintError } from "sequelize";
import { getDatabase } from "../config/database.js";
import { getModels } from "../database/models.js";
import { AppError } from "../errors/app-error.js";

export interface ReservationResult {
  id: string;
  dropId: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  expiresAt: Date;
  availableStock: number;
  stockVersion: string;
  serverTime: Date;
  replayed: boolean;
}

interface ReservationRow {
  id: string;
  dropId: string;
  status: "PENDING";
  expiresAt: Date;
  availableStock: number;
  stockVersion: string;
  serverTime: Date;
}

function reservationTtlSeconds() {
  const value = Number(process.env.RESERVATION_TTL_SECONDS || 60);
  if (!Number.isInteger(value) || value <= 0) throw new Error("RESERVATION_TTL_SECONDS must be a positive integer");
  return value;
}

async function findIdempotentReservation(buyerSessionId: string, idempotencyKey: string): Promise<ReservationResult | null> {
  const { Reservation, Drop } = getModels();
  const reservation = await Reservation.findOne({
    where: { buyerSessionId, reservationIdempotencyKey: idempotencyKey },
    include: [{ model: Drop, as: "drop", attributes: ["availableStock", "stockVersion"] }]
  });
  if (!reservation) return null;
  const drop = reservation.get("drop") as { availableStock: number; stockVersion: string } | undefined;
  return {
    id: reservation.id,
    dropId: reservation.dropId,
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    availableStock: drop?.availableStock ?? 0,
    stockVersion: drop?.stockVersion ?? "0",
    serverTime: new Date(),
    replayed: true
  };
}

export async function reserveDrop(dropId: string, buyerSessionId: string, displayUsername: string, idempotencyKey: string) {
  const existing = await findIdempotentReservation(buyerSessionId, idempotencyKey);
  if (existing) {
    if (existing.dropId !== dropId) throw new AppError(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for another drop");
    return existing;
  }

  const database = getDatabase();
  try {
    return await database.transaction(async (transaction): Promise<ReservationResult> => {
      const rows = await database.query<ReservationRow>(`
        WITH updated_drop AS (
          UPDATE drops
          SET available_stock = available_stock - 1,
              stock_version = stock_version + 1,
              updated_at = NOW()
          WHERE id = :dropId
            AND starts_at <= NOW()
            AND available_stock > 0
          RETURNING id, available_stock, stock_version
        ), inserted_reservation AS (
          INSERT INTO reservations
            (id, drop_id, buyer_session_id, status, expires_at, display_username_snapshot,
             reservation_idempotency_key, created_at, updated_at)
          SELECT gen_random_uuid(), id, :buyerSessionId, 'PENDING',
            NOW() + make_interval(secs => :ttlSeconds), :displayUsername,
            :idempotencyKey, NOW(), NOW()
          FROM updated_drop
          RETURNING id, drop_id, status, expires_at
        ), inserted_event AS (
          INSERT INTO event_outbox
            (event_id, aggregate_type, aggregate_id, event_type, payload, stock_version,
             occurred_at, attempt_count, next_attempt_at, created_at, updated_at)
          SELECT gen_random_uuid(), 'DROP', d.id, 'RESERVATION_CREATED',
            jsonb_build_object(
              'dropId', d.id,
              'reservationId', r.id,
              'availableStock', d.available_stock,
              'expiresAt', r.expires_at
            ), d.stock_version, NOW(), 0, NOW(), NOW(), NOW()
          FROM updated_drop d CROSS JOIN inserted_reservation r
          RETURNING id
        )
        SELECT r.id, r.drop_id AS "dropId", r.status, r.expires_at AS "expiresAt",
          d.available_stock AS "availableStock", d.stock_version AS "stockVersion", NOW() AS "serverTime"
        FROM inserted_reservation r CROSS JOIN updated_drop d
      `, {
        replacements: { dropId, buyerSessionId, displayUsername, idempotencyKey, ttlSeconds: reservationTtlSeconds() },
        type: QueryTypes.SELECT,
        transaction
      });

      const reservation = rows[0];
      if (reservation) return { ...reservation, replayed: false };

      const [drop] = await database.query<{ startsAt: Date; availableStock: number; serverTime: Date }>(`
        SELECT starts_at AS "startsAt", available_stock AS "availableStock", NOW() AS "serverTime"
        FROM drops WHERE id = :dropId
      `, { replacements: { dropId }, type: QueryTypes.SELECT, transaction });
      if (!drop) throw new AppError(404, "DROP_NOT_FOUND", "Drop not found");
      if (new Date(drop.startsAt).getTime() > new Date(drop.serverTime).getTime()) {
        throw new AppError(409, "DROP_NOT_STARTED", "Drop has not started yet", { startsAt: drop.startsAt, serverTime: drop.serverTime });
      }
      throw new AppError(409, "SOLD_OUT", "No stock is currently available");
    });
  } catch (error) {
    const postgresCode = (error as { original?: { code?: string } }).original?.code;
    if (error instanceof UniqueConstraintError || postgresCode === "23505") {
      const replay = await findIdempotentReservation(buyerSessionId, idempotencyKey);
      if (replay) {
        if (replay.dropId !== dropId) throw new AppError(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for another drop");
        return replay;
      }
    }
    throw error;
  }
}
