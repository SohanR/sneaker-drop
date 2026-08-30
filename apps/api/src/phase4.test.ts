import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "./app.js";

describe("Phase 4 HTTP contract", () => {
  it("requires a buyer session before reservation", async () => {
    const response = await request(app)
      .post("/api/v1/drops/19b3e21e-2936-4a95-9914-8eb16ad2fa31/reservations")
      .set("Idempotency-Key", "6a81f36e-2507-45c4-a033-8e938abbd1e6")
      .expect(401);
    expect(response.body.error.code).toBe("BUYER_SESSION_REQUIRED");
  });

  it("documents the reservation path and required idempotency header", async () => {
    const response = await request(app).get("/api/openapi.json").expect(200);
    const operation = response.body.paths["/drops/{dropId}/reservations"].post;
    expect(operation.responses).toHaveProperty("201");
    expect(operation.responses).toHaveProperty("409");
    expect(operation.parameters).toContainEqual(expect.objectContaining({ name: "Idempotency-Key", required: true }));
  });
});

describe("atomic reservation service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("atomically decrements, inserts the hold, and records an outbox event", async () => {
    const findOne = vi.fn(async () => null);
    const reservationRow = {
      id: "a5297691-d175-44c8-9350-1ef47c3d1e2d",
      dropId: "19b3e21e-2936-4a95-9914-8eb16ad2fa31",
      status: "PENDING",
      expiresAt: new Date("2026-08-30T15:01:00Z"),
      availableStock: 9,
      stockVersion: "1",
      serverTime: new Date("2026-08-30T15:00:00Z")
    };
    const query = vi.fn(async (_sql: string, _options?: unknown) => [reservationRow]);
    const transaction = vi.fn(async (work: (transaction: object) => unknown) => work({ id: "transaction" }));
    vi.doMock("./database/models.js", () => ({ getModels: () => ({ Reservation: { findOne }, Drop: {} }) }));
    vi.doMock("./config/database.js", () => ({ getDatabase: () => ({ query, transaction }) }));

    const { reserveDrop } = await import("./services/reservation-service.js");
    const result = await reserveDrop(reservationRow.dropId, "buyer-id", "buyer_name", "6a81f36e-2507-45c4-a033-8e938abbd1e6");
    expect(result).toMatchObject({ id: reservationRow.id, availableStock: 9, replayed: false });
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0]?.[0] || "";
    expect(sql).toContain("available_stock = available_stock - 1");
    expect(sql).toContain("available_stock > 0");
    expect(sql).toContain("starts_at <= NOW()");
    expect(sql).toContain("NOW() + make_interval");
    expect(sql).toContain("RESERVATION_CREATED");
  });

  it("returns an existing reservation without another stock mutation", async () => {
    const existing = {
      id: "a5297691-d175-44c8-9350-1ef47c3d1e2d",
      dropId: "19b3e21e-2936-4a95-9914-8eb16ad2fa31",
      status: "PENDING",
      expiresAt: new Date("2026-08-30T15:01:00Z"),
      get: () => ({ availableStock: 9, stockVersion: "1" })
    };
    const transaction = vi.fn();
    vi.doMock("./database/models.js", () => ({ getModels: () => ({ Reservation: { findOne: vi.fn(async () => existing) }, Drop: {} }) }));
    vi.doMock("./config/database.js", () => ({ getDatabase: () => ({ transaction }) }));

    const { reserveDrop } = await import("./services/reservation-service.js");
    const result = await reserveDrop(existing.dropId, "buyer-id", "buyer_name", "6a81f36e-2507-45c4-a033-8e938abbd1e6");
    expect(result).toMatchObject({ id: existing.id, replayed: true });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("classifies a zero-row update as a pre-start conflict", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ startsAt: new Date("2026-08-30T16:00:00Z"), availableStock: 10, serverTime: new Date("2026-08-30T15:00:00Z") }]);
    const transaction = vi.fn(async (work: (transaction: object) => unknown) => work({}));
    vi.doMock("./database/models.js", () => ({ getModels: () => ({ Reservation: { findOne: vi.fn(async () => null) }, Drop: {} }) }));
    vi.doMock("./config/database.js", () => ({ getDatabase: () => ({ query, transaction }) }));

    const { reserveDrop } = await import("./services/reservation-service.js");
    await expect(reserveDrop("19b3e21e-2936-4a95-9914-8eb16ad2fa31", "buyer-id", "buyer_name", "6a81f36e-2507-45c4-a033-8e938abbd1e6"))
      .rejects.toMatchObject({ status: 409, code: "DROP_NOT_STARTED" });
  });
});
