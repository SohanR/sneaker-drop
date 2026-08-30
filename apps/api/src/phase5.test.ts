import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "./app.js";

describe("Phase 5 HTTP contracts", () => {
  it("protects the cron sweeper", async () => {
    const response = await request(app).get("/api/v1/internal/cron/expire-reservations").expect(401);
    expect(response.body.error.code).toBe("CRON_UNAUTHORIZED");
  });

  it("requires buyer ownership for settlement", async () => {
    const response = await request(app)
      .post("/api/v1/reservations/a5297691-d175-44c8-9350-1ef47c3d1e2d/complete")
      .set("Idempotency-Key", "6a81f36e-2507-45c4-a033-8e938abbd1e6")
      .expect(401);
    expect(response.body.error.code).toBe("BUYER_SESSION_REQUIRED");
  });

  it("documents locked purchase settlement", async () => {
    const response = await request(app).get("/api/openapi.json").expect(200);
    const operation = response.body.paths["/reservations/{reservationId}/complete"].post;
    expect(operation.responses).toHaveProperty("201");
    expect(operation.responses).toHaveProperty("409");
  });
});

describe("pessimistic settlement", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("locks and completes a valid hold without decrementing stock", async () => {
    const locked = {
      id: "a5297691-d175-44c8-9350-1ef47c3d1e2d",
      dropId: "19b3e21e-2936-4a95-9914-8eb16ad2fa31",
      status: "PENDING",
      expiresAt: new Date("2026-08-30T15:01:00Z"),
      completedAt: null,
      settlementIdempotencyKey: null,
      displayUsername: "buyer_name",
      serverTime: new Date("2026-08-30T15:00:00Z")
    };
    const completed = { completedAt: new Date("2026-08-30T15:00:01Z"), serverTime: new Date("2026-08-30T15:00:01Z") };
    const query = vi.fn()
      .mockResolvedValueOnce([locked])
      .mockResolvedValueOnce([completed])
      .mockResolvedValueOnce([]);
    const transaction = vi.fn(async (work: (transaction: object) => unknown) => work({}));
    vi.doMock("./config/database.js", () => ({ getDatabase: () => ({ query, transaction }) }));

    const { settleReservation } = await import("./services/settlement-service.js");
    const result = await settleReservation(locked.id, "buyer-id", "6a81f36e-2507-45c4-a033-8e938abbd1e6");
    expect(result).toMatchObject({ status: "COMPLETED", idempotentReplay: false });
    const statements = query.mock.calls.map((call) => String(call[0]));
    expect(statements[0]).toContain("FOR UPDATE OF r");
    expect(statements[1]).toContain("status = 'COMPLETED'");
    expect(statements[2]).toContain("PURCHASE_COMPLETED");
    expect(statements.join("\n")).not.toContain("available_stock = available_stock - 1");
  });

  it("commits expiry recovery before returning an expired conflict", async () => {
    const locked = {
      id: "a5297691-d175-44c8-9350-1ef47c3d1e2d",
      dropId: "19b3e21e-2936-4a95-9914-8eb16ad2fa31",
      status: "PENDING",
      expiresAt: new Date("2026-08-30T14:59:00Z"),
      completedAt: null,
      settlementIdempotencyKey: null,
      displayUsername: "buyer_name",
      serverTime: new Date("2026-08-30T15:00:00Z")
    };
    const query = vi.fn()
      .mockResolvedValueOnce([locked])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ availableStock: 1, stockVersion: "2" }])
      .mockResolvedValueOnce([]);
    const transaction = vi.fn(async (work: (transaction: object) => unknown) => work({}));
    vi.doMock("./config/database.js", () => ({ getDatabase: () => ({ query, transaction }) }));

    const { settleReservation } = await import("./services/settlement-service.js");
    await expect(settleReservation(locked.id, "buyer-id", "6a81f36e-2507-45c4-a033-8e938abbd1e6"))
      .rejects.toMatchObject({ status: 409, code: "RESERVATION_EXPIRED", details: { stockRecovered: true } });
    const statements = query.mock.calls.map((call) => String(call[0])).join("\n");
    expect(statements).toContain("available_stock = available_stock + 1");
    expect(statements).toContain("INVENTORY_RECOVERED");
  });

  it("replays a completed settlement under the same locked key", async () => {
    const key = "6a81f36e-2507-45c4-a033-8e938abbd1e6";
    const query = vi.fn(async () => [{
      id: "a5297691-d175-44c8-9350-1ef47c3d1e2d",
      dropId: "19b3e21e-2936-4a95-9914-8eb16ad2fa31",
      status: "COMPLETED",
      expiresAt: new Date("2026-08-30T15:01:00Z"),
      completedAt: new Date("2026-08-30T15:00:01Z"),
      settlementIdempotencyKey: key,
      displayUsername: "buyer_name",
      serverTime: new Date("2026-08-30T15:00:02Z")
    }]);
    const transaction = vi.fn(async (work: (transaction: object) => unknown) => work({}));
    vi.doMock("./config/database.js", () => ({ getDatabase: () => ({ query, transaction }) }));

    const { settleReservation } = await import("./services/settlement-service.js");
    await expect(settleReservation("a5297691-d175-44c8-9350-1ef47c3d1e2d", "buyer-id", key))
      .resolves.toMatchObject({ status: "COMPLETED", idempotentReplay: true });
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("bounded expiration sweeper", () => {
  it("processes batches until fewer than the configured limit remain", async () => {
    vi.resetModules();
    vi.stubEnv("SWEEPER_BATCH_SIZE", "2");
    vi.stubEnv("SWEEPER_MAX_BATCHES", "3");
    const expire = vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    vi.doMock("./services/drop-service.js", () => ({ expireOverdueReservations: expire }));
    vi.doMock("./config/database.js", () => ({
      getDatabase: () => ({ transaction: (work: (transaction: object) => unknown) => work({}) })
    }));
    const { sweepExpiredReservations } = await import("./services/expiration-service.js");
    await expect(sweepExpiredReservations()).resolves.toEqual({ expiredCount: 3, batchesProcessed: 2, hasMore: false });
    expect(expire).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
  });
});
