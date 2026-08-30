import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import app from "./app.js";
import { getAuthConfig } from "./config/auth.js";
import { verifyAdminToken } from "./services/admin-auth-service.js";

describe("Phase 3 HTTP contracts", () => {
  it("rejects invalid buyer display names with the standard envelope", async () => {
    const response = await request(app).post("/api/v1/sessions").send({ displayUsername: "?" }).expect(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("protects drop creation with an admin bearer token", async () => {
    const response = await request(app).post("/api/v1/drops").send({}).expect(401);
    expect(response.body.error.code).toBe("ADMIN_TOKEN_REQUIRED");
  });

  it("documents sessions, login, dashboard reads, and protected drop creation", async () => {
    const response = await request(app).get("/api/openapi.json").expect(200);
    expect(response.body.paths).toHaveProperty("/sessions");
    expect(response.body.paths).toHaveProperty("/admin/login");
    expect(response.body.paths).toHaveProperty("/drops");
    expect(response.body.paths["/drops"].post.security).toEqual([{ adminBearer: [] }]);
  });
});

describe("admin JWT verification", () => {
  it("accepts correctly scoped admin claims", () => {
    const config = getAuthConfig();
    const token = jwt.sign({ role: "ADMIN" }, config.adminJwtSecret, {
      subject: "19b3e21e-2936-4a95-9914-8eb16ad2fa31",
      issuer: config.adminJwtIssuer,
      audience: config.adminJwtAudience,
      expiresIn: 60
    });
    expect(verifyAdminToken(token)).toMatchObject({ sub: "19b3e21e-2936-4a95-9914-8eb16ad2fa31", role: "ADMIN" });
  });

  it("rejects incorrectly scoped claims", () => {
    const config = getAuthConfig();
    const token = jwt.sign({ role: "BUYER" }, config.adminJwtSecret, { expiresIn: 60 });
    expect(() => verifyAdminToken(token)).toThrow("Admin token is missing, invalid, or expired");
  });
});

describe("lazy expiration SQL invariants", () => {
  it("uses locked bounded recovery and writes a durable event", async () => {
    vi.resetModules();
    const query = vi.fn(async (_sql: string, _options?: unknown) => [{ expired_count: "2" }]);
    vi.doMock("./config/database.js", () => ({ getDatabase: () => ({ query }) }));
    vi.doMock("./database/models.js", () => ({ getModels: vi.fn() }));
    const { expireOverdueReservations } = await import("./services/drop-service.js");
    await expect(expireOverdueReservations(25)).resolves.toBe(2);
    const sql = query.mock.calls[0]?.[0] || "";
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).toContain("LIMIT :limit");
    expect(sql).toContain("status = 'PENDING'");
    expect(sql).toContain("INVENTORY_RECOVERED");
    expect(query.mock.calls[0]?.[1]).toMatchObject({ replacements: { limit: 25 } });
  });
});
