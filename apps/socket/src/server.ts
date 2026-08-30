import { createSocketServer } from "./create-server.js";
import { socketEnv } from "./config/env.js";
import { getRelayConfig } from "./config/realtime.js";
import { createRelayPool } from "./database.js";
import { OutboxRelay } from "./outbox-relay.js";

const { httpServer, io } = createSocketServer(socketEnv.allowedOrigins);
const relayConfig = getRelayConfig();
const relay = new OutboxRelay({
  pool: createRelayPool(),
  io,
  batchSize: relayConfig.batchSize,
  pollIntervalMs: relayConfig.pollIntervalMs
});

httpServer.listen(socketEnv.SOCKET_PORT, () => {
  console.log(`Socket service listening on http://localhost:${socketEnv.SOCKET_PORT}`);
  relay.start();
});

async function shutdown() {
  await relay.stop();
  io.close();
  httpServer.close(() => process.exit(0));
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
