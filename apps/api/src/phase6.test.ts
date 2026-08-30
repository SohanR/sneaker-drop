import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app.js";

describe("Phase 6 realtime API contract", () => {
  it("requires a buyer session to issue a realtime token", async () => {
    const response = await request(app).post("/api/v1/realtime/token").expect(401);
    expect(response.body.error.code).toBe("BUYER_SESSION_REQUIRED");
  });

  it("documents realtime token issuance", async () => {
    const response = await request(app).get("/api/openapi.json").expect(200);
    expect(response.body.info.version).toBe("0.6.0");
    expect(response.body.paths["/realtime/token"].post.security).toEqual([{ buyerCookie: [] }]);
  });
});
