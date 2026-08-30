import { afterEach, describe, expect, it } from "vitest";
import { createSocketServer } from "./create-server.js";

describe("socket service foundation", () => {
  const servers: ReturnType<typeof createSocketServer>[] = [];
  afterEach(() => servers.splice(0).forEach(({ io }) => io.close()));

  it("returns a health response", async () => {
    const server = createSocketServer(["http://localhost:5173"]);
    servers.push(server);
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    const address = server.httpServer.address();
    if (!address || typeof address === "string") throw new Error("Expected an assigned TCP port");
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", service: "socket" });
  });
});
