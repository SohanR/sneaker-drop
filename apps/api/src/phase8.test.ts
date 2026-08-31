import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repositoryRoot = new URL("../../../", import.meta.url);

describe("production deployment contract", () => {
  it("deploys web, API, WebSocket, and expiration cron on Vercel", () => {
    const config = JSON.parse(readFileSync(new URL("vercel.json", repositoryRoot), "utf8")) as {
      buildCommand: string;
      outputDirectory: string;
      regions: string[];
      functions: Record<string, { maxDuration: number }>;
      rewrites: Array<{ source: string; destination: string }>;
      crons: Array<{ path: string; schedule: string }>;
    };

    expect(config.buildCommand).toBe("npm run build:web");
    expect(config.outputDirectory).toBe("apps/web/dist");
    expect(config.regions).toEqual(["sin1"]);
    expect(config.functions["api/socket.ts"]?.maxDuration).toBe(60);
    expect(config.rewrites[0]).toEqual({ source: "/socket.io/(.*)", destination: "/api/socket" });
    expect(config.crons).toContainEqual({
      path: "/api/v1/internal/cron/expire-reservations",
      schedule: "0 0 * * *"
    });
  });

  it("uses PostgreSQL for cross-instance Socket.IO delivery without Redis", () => {
    const entry = readFileSync(new URL("api/socket.ts", repositoryRoot), "utf8");
    const socketPackage = readFileSync(new URL("apps/socket/package.json", repositoryRoot), "utf8");
    expect(entry).toContain("configurePostgresAdapter");
    expect(entry).toContain("OutboxRelay");
    expect(socketPackage).toContain("@socket.io/postgres-adapter");
    expect(socketPackage.toLowerCase()).not.toContain("redis");
  });

  it("keeps Vercel function entries inside an explicit ESM package boundary", () => {
    const functionPackage = JSON.parse(readFileSync(new URL("api/package.json", repositoryRoot), "utf8"));
    const apiEntry = readFileSync(new URL("api/index.ts", repositoryRoot), "utf8");
    expect(functionPackage.type).toBe("module");
    expect(apiEntry).toContain("import(\"../apps/api/src/app.js\")");
  });
});
