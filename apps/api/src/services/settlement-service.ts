import { QueryTypes } from "sequelize";
import { getDatabase } from "../config/database.js";
import { AppError } from "../errors/app-error.js";

interface LockedReservation {
  id: string;
  dropId: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  expiresAt: Date;
  completedAt: Date | null;
  settlementIdempotencyKey: string | null;
  displayUsername: string;
  serverTime: Date;
}

export interface SettlementResult {
  id: string;
  dropId: string;
  status: "COMPLETED";
  completedAt: Date;
  serverTime: Date;
  idempotentReplay: boolean;
}

type TransactionOutcome =
  | { kind: "completed"; result: SettlementResult }
  | { kind: "expired"; expiresAt: Date; serverTime: Date }
  | { kind: "already-expired"; expiresAt: Date; serverTime: Date };

export async function settleReservation(reservationId: string, buyerSessionId: string, idempotencyKey: string) {
  const database = getDatabase();
  const outcome = await database.transaction(async (transaction): Promise<TransactionOutcome> => {
    const [reservation] = await database.query<LockedReservation>(`
      SELECT r.id, r.drop_id AS "dropId", r.status, r.expires_at AS "expiresAt",
        r.completed_at AS "completedAt", r.settlement_idempotency_key AS "settlementIdempotencyKey",
        r.display_username_snapshot AS "displayUsername", NOW() AS "serverTime"
      FROM reservations r
      WHERE r.id = :reservationId AND r.buyer_session_id = :buyerSessionId
      FOR UPDATE OF r
    `, { replacements: { reservationId, buyerSessionId }, type: QueryTypes.SELECT, transaction });

    if (!reservation) throw new AppError(404, "RESERVATION_NOT_FOUND", "Reservation not found");
    if (reservation.status === "COMPLETED") {
      if (reservation.settlementIdempotencyKey !== idempotencyKey) {
        throw new AppError(409, "RESERVATION_ALREADY_COMPLETED", "Reservation was completed with another idempotency key");
      }
      return {
        kind: "completed",
        result: {
          id: reservation.id,
          dropId: reservation.dropId,
          status: "COMPLETED",
          completedAt: reservation.completedAt!,
          serverTime: reservation.serverTime,
          idempotentReplay: true
        }
      };
    }
    if (reservation.status === "EXPIRED") {
      return { kind: "already-expired", expiresAt: reservation.expiresAt, serverTime: reservation.serverTime };
    }

    if (new Date(reservation.expiresAt).getTime() < new Date(reservation.serverTime).getTime()) {
      await database.query(`
        UPDATE reservations
        SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
        WHERE id = :reservationId AND status = 'PENDING'
      `, { replacements: { reservationId }, transaction });
      const [drop] = await database.query<{ availableStock: number; stockVersion: string }>(`
        UPDATE drops
        SET available_stock = available_stock + 1, stock_version = stock_version + 1, updated_at = NOW()
        WHERE id = :dropId
        RETURNING available_stock AS "availableStock", stock_version AS "stockVersion"
      `, { replacements: { dropId: reservation.dropId }, type: QueryTypes.SELECT, transaction });
      await database.query(`
        INSERT INTO event_outbox
          (event_id, aggregate_type, aggregate_id, event_type, payload, stock_version,
           occurred_at, attempt_count, next_attempt_at, created_at, updated_at)
        VALUES (
          gen_random_uuid(), 'DROP', :dropId, 'INVENTORY_RECOVERED',
          jsonb_build_object('dropId', :dropId, 'reservationId', :reservationId,
            'availableStock', :availableStock, 'recoveredQuantity', 1),
          :stockVersion, NOW(), 0, NOW(), NOW(), NOW()
        )
      `, {
        replacements: {
          dropId: reservation.dropId,
          reservationId,
          availableStock: drop?.availableStock,
          stockVersion: drop?.stockVersion
        },
        transaction
      });
      return { kind: "expired", expiresAt: reservation.expiresAt, serverTime: reservation.serverTime };
    }

    const [completed] = await database.query<{ completedAt: Date; serverTime: Date }>(`
      UPDATE reservations
      SET status = 'COMPLETED', completed_at = NOW(), settlement_idempotency_key = :idempotencyKey, updated_at = NOW()
      WHERE id = :reservationId AND status = 'PENDING'
      RETURNING completed_at AS "completedAt", NOW() AS "serverTime"
    `, { replacements: { reservationId, idempotencyKey }, type: QueryTypes.SELECT, transaction });
    await database.query(`
      INSERT INTO event_outbox
        (event_id, aggregate_type, aggregate_id, event_type, payload, stock_version,
         occurred_at, attempt_count, next_attempt_at, created_at, updated_at)
      SELECT gen_random_uuid(), 'DROP', d.id, 'PURCHASE_COMPLETED',
        jsonb_build_object('dropId', d.id, 'reservationId', :reservationId,
          'displayUsername', :displayUsername, 'completedAt', :completedAt),
        d.stock_version, NOW(), 0, NOW(), NOW(), NOW()
      FROM drops d WHERE d.id = :dropId
    `, {
      replacements: {
        dropId: reservation.dropId,
        reservationId,
        displayUsername: reservation.displayUsername,
        completedAt: completed?.completedAt
      },
      transaction
    });
    return {
      kind: "completed",
      result: {
        id: reservation.id,
        dropId: reservation.dropId,
        status: "COMPLETED",
        completedAt: completed!.completedAt,
        serverTime: completed!.serverTime,
        idempotentReplay: false
      }
    };
  });

  if (outcome.kind !== "completed") {
    throw new AppError(409, "RESERVATION_EXPIRED", "Reservation has expired", {
      expiresAt: outcome.expiresAt,
      serverTime: outcome.serverTime,
      stockRecovered: outcome.kind === "expired"
    });
  }
  return outcome.result;
}
