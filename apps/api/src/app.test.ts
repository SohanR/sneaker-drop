import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app.js";

describe("API foundation", () => {
  it("returns health and a request ID", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body).toMatchObject({ status: "ok", service: "api", version: "0.1.0" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("uses the standard error envelope", async () => {
    const response = await request(app).get("/missing").expect(404);
    expect(response.body.error).toMatchObject({ code: "NOT_FOUND", message: "Route not found" });
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("publishes the OpenAPI document", async () => {
    const response = await request(app).get("/api/openapi.json").expect(200);
    expect(response.body.openapi).toBe("3.1.0");
  });
});
