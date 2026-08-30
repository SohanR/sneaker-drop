import { createServer } from "node:http";
import { Server } from "socket.io";
import type { HealthResponse } from "@sneaker-drop/contracts";
import { verifySocketToken, type SocketIdentity } from "./auth.js";

export function createSocketServer(
  allowedOrigins: string[],
  tokenVerifier: (token: unknown) => SocketIdentity = verifySocketToken
) {
  const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      const body: HealthResponse = {
        status: "ok",
        service: "socket",
        timestamp: new Date().toISOString(),
        version: "0.1.0"
      };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }
    res.writeHead(404).end();
  });

  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    transports: ["websocket", "polling"]
  });

  io.use((socket, next) => {
    try {
      socket.data.identity = tokenVerifier(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    void socket.join("dashboard");
    socket.on("drop:subscribe", (dropId: unknown, acknowledge?: (result: { ok: boolean }) => void) => {
      const valid = typeof dropId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dropId);
      if (valid) void socket.join("drop:" + dropId);
      acknowledge?.({ ok: valid });
    });
    socket.on("drop:unsubscribe", (dropId: unknown) => {
      if (typeof dropId === "string") void socket.leave("drop:" + dropId);
    });
    socket.emit("system:ready", {
      connectedAt: new Date().toISOString(),
      buyerSessionId: socket.data.identity.buyerSessionId
    });
  });

  return { httpServer, io };
}
