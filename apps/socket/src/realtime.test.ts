import jwt from "jsonwebtoken";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySocketToken } from "./auth.js";
import { getSocketAuthConfig } from "./config/realtime.js";
import { createSocketServer } from "./create-server.js";
import { OutboxRelay } from "./outbox-relay.js";

const clients: ClientSocket[] = [];
const servers: ReturnType<typeof createSocketServer>[] = [];

afterEach(() => {
  clients.splice(0).forEach((client) => client.disconnect());
  servers.splice(0).forEach(({ io }) => io.close());
  vi.restoreAllMocks();
});

async function listen(server: ReturnType<typeof createSocketServer>) {
  servers.push(server);
  await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
  const address = server.httpServer.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP address");
  return `http://127.0.0.1:${address.port}`;
}

describe("realtime authentication and rooms", () => {
  it("verifies a correctly scoped short-lived token", () => {
    const config = getSocketAuthConfig();
    const token = jwt.sign({ scope: "realtime" }, config.secret, {
      subject: "buyer-session-id",
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: 60
    });
    expect(verifySocketToken(token)).toEqual({ buyerSessionId: "buyer-session-id" });
  });

  it("rejects unauthenticated socket connections", async () => {
    const url = await listen(createSocketServer(["http://localhost:5173"], () => { throw new Error("invalid"); }));
    const client = createClient(url, { transports: ["websocket"], forceNew: true });
    clients.push(client);
    const message = await new Promise<string>((resolve) => client.on("connect_error", (error) => resolve(error.message)));
    expect(message).toBe("UNAUTHORIZED");
  });

  it("joins the dashboard and validated drop rooms", async () => {
    const server = createSocketServer(["http://localhost:5173"], () => ({ buyerSessionId: "buyer-id" }));
    const url = await listen(server);
    const client = createClient(url, { transports: ["websocket"], forceNew: true, auth: { token: "accepted" } });
    clients.push(client);
    await new Promise<void>((resolve) => client.on("system:ready", () => resolve()));

    const dropId = "19b3e21e-2936-4a95-9914-8eb16ad2fa31";
    const acknowledged = await new Promise<{ ok: boolean }>((resolve) => client.emit("drop:subscribe", dropId, resolve));
    expect(acknowledged).toEqual({ ok: true });

    const dashboardEvent = new Promise<string>((resolve) => client.once("test:dashboard", resolve));
    server.io.to("dashboard").emit("test:dashboard", "dashboard-message");
    await expect(dashboardEvent).resolves.toBe("dashboard-message");

    const dropEvent = new Promise<string>((resolve) => client.once("test:drop", resolve));
    server.io.to(`drop:${dropId}`).emit("test:drop", "drop-message");
    await expect(dropEvent).resolves.toBe("drop-message");
  });
});

describe("PostgreSQL outbox relay", () => {
  it("publishes locked rows before marking them delivered", async () => {
    const row = {
      id: "1",
      eventId: "6a81f36e-2507-45c4-a033-8e938abbd1e6",
      aggregateId: "19b3e21e-2936-4a95-9914-8eb16ad2fa31",
      eventType: "RESERVATION_CREATED",
      payload: { availableStock: 9 },
      stockVersion: "1",
      occurredAt: new Date("2026-08-30T15:00:00Z")
    };
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const client = { query, release: vi.fn() };
    const pool = { connect: vi.fn(async () => client), query: vi.fn(), end: vi.fn() };
    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) };
    const relay = new OutboxRelay({ pool: pool as never, io: io as never, batchSize: 100, pollIntervalMs: 250 });

    await expect(relay.pollOnce()).resolves.toBe(1);
    expect(query.mock.calls[1]?.[0]).toContain("FOR UPDATE SKIP LOCKED");
    expect(emit).toHaveBeenCalledWith("inventory:event", expect.objectContaining({ eventId: row.eventId, stockVersion: 1 }));
    expect(query.mock.calls[2]?.[0]).toContain("published_at = NOW()");
    expect(query.mock.calls[3]?.[0]).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back and records retry backoff when publishing fails", async () => {
    const row = {
      id: "7", eventId: "event-id", aggregateId: "drop-id", eventType: "DROP_CREATED",
      payload: {}, stockVersion: "1", occurredAt: new Date()
    };
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [] });
    const client = { query, release: vi.fn() };
    const poolQuery = vi.fn(async (_sql: string, _values?: unknown[]) => ({ rows: [] }));
    const pool = { connect: vi.fn(async () => client), query: poolQuery, end: vi.fn() };
    const io = { to: vi.fn(() => ({ emit: () => { throw new Error("publish failed"); } })) };
    const relay = new OutboxRelay({ pool: pool as never, io: io as never, batchSize: 100, pollIntervalMs: 250 });

    await expect(relay.pollOnce()).rejects.toThrow("publish failed");
    expect(query.mock.calls[2]?.[0]).toBe("ROLLBACK");
    expect(poolQuery.mock.calls[0]?.[0]).toContain("attempt_count = attempt_count + 1");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
