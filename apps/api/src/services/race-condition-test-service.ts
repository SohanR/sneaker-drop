import { randomUUID } from "node:crypto";
import { QueryTypes } from "sequelize";
import { getDatabase } from "../config/database.js";
import { AppError } from "../errors/app-error.js";
import { reserveDrop } from "./reservation-service.js";

interface TestBuyer {
  id: string;
  displayUsername: string;
}

interface VerificationRow {
  availableStock: number;
  reservationCount: string;
}

export interface RaceConditionTestResult {
  attemptedReservations: number;
  successfulReservations: number;
  soldOutConflicts: number;
  unexpectedFailures: number;
  finalAvailableStock: number;
  persistedReservations: number;
  invariantPassed: boolean;
  durationMs: number;
  cleanedUp: boolean;
}

export async function runLastItemRaceTest(concurrency: number, adminId: string): Promise<RaceConditionTestResult> {
  const database = getDatabase();
  const dropId = randomUUID();
  const buyerIds: string[] = [];

  try {
    const buyers = await database.transaction(async (transaction) => {
      await database.query(`
        INSERT INTO drops
          (id, name, description, price, currency, total_stock, available_stock,
           starts_at, stock_version, created_by, created_at, updated_at)
        VALUES
          (:dropId, :name, :description, 1.00, 'USD', 1, 1,
           NOW() - INTERVAL '1 second', 0, :adminId, NOW(), NOW())
      `, {
        replacements: {
          dropId,
          adminId,
          name: `Race Test ${new Date().toISOString()}`,
          description: "Temporary one-unit drop for atomic reservation verification"
        },
        transaction
      });

      const rows = await database.query<TestBuyer>(`
        INSERT INTO buyer_sessions
          (id, display_username, session_token_hash, expires_at, last_seen_at, created_at, updated_at)
        SELECT gen_random_uuid(), 'race_user_' || series,
          md5(:dropId || ':' || series::text), NOW() + INTERVAL '5 minutes', NOW(), NOW(), NOW()
        FROM generate_series(1, :concurrency) AS series
        RETURNING id, display_username AS "displayUsername"
      `, { replacements: { dropId, concurrency }, type: QueryTypes.SELECT, transaction });
      buyerIds.push(...rows.map((buyer) => buyer.id));
      return rows;
    });

    const startedAt = performance.now();
    const attempts = await Promise.allSettled(buyers.map((buyer) => reserveDrop(
      dropId,
      buyer.id,
      buyer.displayUsername,
      randomUUID()
    )));
    const durationMs = Math.round(performance.now() - startedAt);

    const successfulReservations = attempts.filter((attempt) => attempt.status === "fulfilled").length;
    const soldOutConflicts = attempts.filter((attempt) =>
      attempt.status === "rejected"
      && attempt.reason instanceof AppError
      && attempt.reason.status === 409
      && attempt.reason.code === "SOLD_OUT"
    ).length;
    const unexpectedFailures = concurrency - successfulReservations - soldOutConflicts;

    const [verification] = await database.query<VerificationRow>(`
      SELECT d.available_stock AS "availableStock",
        COUNT(r.id)::text AS "reservationCount"
      FROM drops d
      LEFT JOIN reservations r ON r.drop_id = d.id
      WHERE d.id = :dropId
      GROUP BY d.id, d.available_stock
    `, { replacements: { dropId }, type: QueryTypes.SELECT });

    const finalAvailableStock = verification?.availableStock ?? -1;
    const persistedReservations = Number(verification?.reservationCount ?? -1);
    return {
      attemptedReservations: concurrency,
      successfulReservations,
      soldOutConflicts,
      unexpectedFailures,
      finalAvailableStock,
      persistedReservations,
      invariantPassed: successfulReservations === 1
        && soldOutConflicts === concurrency - 1
        && unexpectedFailures === 0
        && finalAvailableStock === 0
        && persistedReservations === 1,
      durationMs,
      cleanedUp: true
    };
  } finally {
    await database.transaction(async (transaction) => {
      await database.query("DELETE FROM event_outbox WHERE aggregate_id = :dropId", { replacements: { dropId }, transaction });
      await database.query("DELETE FROM reservations WHERE drop_id = :dropId", { replacements: { dropId }, transaction });
      await database.query("DELETE FROM drops WHERE id = :dropId", { replacements: { dropId }, transaction });
      if (buyerIds.length > 0) {
        await database.query("DELETE FROM buyer_sessions WHERE id IN (:buyerIds)", { replacements: { buyerIds }, transaction });
      }
    });
  }
}
