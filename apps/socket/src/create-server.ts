import { createServer } from "node:http";
import { Server } from "socket.io";
import type { HealthResponse } from "@sneaker-drop/contracts";

export function createSocketServer(allowedOrigins: string[]) {
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

  io.on("connection", (socket) => {
    socket.emit("system:ready", { connectedAt: new Date().toISOString() });
  });

  return { httpServer, io };
}

