import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repositoryRoot = new URL("../../../", import.meta.url);

describe("production deployment contract", () => {
  it("builds the web application and preserves the expiration cron", () => {
    const config = JSON.parse(readFileSync(new URL("vercel.json", repositoryRoot), "utf8")) as {
      buildCommand: string;
      outputDirectory: string;
      crons: Array<{ path: string; schedule: string }>;
    };

    expect(config.buildCommand).toBe("npm run build:web");
    expect(config.outputDirectory).toBe("apps/web/dist");
    expect(config.crons).toContainEqual({
      path: "/api/v1/internal/cron/expire-reservations",
      schedule: "* * * * *"
    });
  });

  it("pins the Redis-free socket relay to one persistent instance", () => {
    const blueprint = readFileSync(new URL("render.yaml", repositoryRoot), "utf8");
    expect(blueprint).toContain("numInstances: 1");
    expect(blueprint).toContain("healthCheckPath: /health");
    expect(blueprint.toLowerCase()).not.toContain("redis");
  });
});
