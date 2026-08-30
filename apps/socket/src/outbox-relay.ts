import type { Pool, PoolClient } from "pg";
import type { Server } from "socket.io";
import type { RealtimeEvent } from "@sneaker-drop/contracts";

interface OutboxRow {
  id: string;
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  stockVersion: string | null;
  occurredAt: Date;
}

export interface RelayOptions {
  pool: Pool;
  io: Server;
  batchSize: number;
  pollIntervalMs: number;
}

export class OutboxRelay {
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private readonly options: RelayOptions) {}

  async pollOnce() {
    const client = await this.options.pool.connect();
    let claimedIds: string[] = [];
    try {
      await client.query("BEGIN");
      const result = await client.query<OutboxRow>(`
        SELECT id::text, event_id AS "eventId", aggregate_id AS "aggregateId",
          event_type AS "eventType", payload, stock_version::text AS "stockVersion",
          occurred_at AS "occurredAt"
        FROM event_outbox
        WHERE published_at IS NULL AND next_attempt_at <= NOW()
        ORDER BY id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      `, [this.options.batchSize]);
      claimedIds = result.rows.map((row) => row.id);

      for (const row of result.rows) this.publish(row);
      if (claimedIds.length > 0) {
        await client.query(`
          UPDATE event_outbox
          SET published_at = NOW(), updated_at = NOW(), last_error = NULL
          WHERE id = ANY($1::bigint[])
        `, [claimedIds]);
      }
      await client.query("COMMIT");
      return claimedIds.length;
    } catch (error) {
      await this.rollback(client);
      if (claimedIds.length > 0) await this.recordFailure(claimedIds, error);
      throw error;
    } finally {
      client.release();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    void this.tick();
  }

  async stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    await this.options.pool.end();
  }

  private publish(row: OutboxRow) {
    const event: RealtimeEvent = {
      eventId: row.eventId,
      eventType: row.eventType,
      aggregateId: row.aggregateId,
      occurredAt: new Date(row.occurredAt).toISOString(),
      ...(row.stockVersion === null ? {} : { stockVersion: Number(row.stockVersion) }),
      payload: row.payload
    };
    this.options.io.to("dashboard").emit("inventory:event", event);
    this.options.io.to(`drop:${row.aggregateId}`).emit("drop:event", event);
  }

  private async tick() {
    if (!this.running) return;
    try {
      await this.pollOnce();
    } catch (error) {
      console.error("Outbox relay poll failed", error);
    } finally {
      if (this.running) this.timer = setTimeout(() => void this.tick(), this.options.pollIntervalMs);
    }
  }

  private async rollback(client: PoolClient) {
    try { await client.query("ROLLBACK"); } catch { /* connection is already unusable */ }
  }

  private async recordFailure(ids: string[], error: unknown) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown relay error";
    await this.options.pool.query(`
      UPDATE event_outbox
      SET attempt_count = attempt_count + 1,
          next_attempt_at = NOW() + LEAST(300, POWER(2, attempt_count + 1)) * INTERVAL '1 second',
          last_error = $2,
          updated_at = NOW()
      WHERE id = ANY($1::bigint[]) AND published_at IS NULL
    `, [ids, message]);
  }
}
