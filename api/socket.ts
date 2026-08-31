import { createSocketServer } from "../apps/socket/src/create-server.js";
import { socketEnv } from "../apps/socket/src/config/env.js";
import { getRelayConfig } from "../apps/socket/src/config/realtime.js";
import { createRelayPool } from "../apps/socket/src/database.js";
import { OutboxRelay } from "../apps/socket/src/outbox-relay.js";
import { configurePostgresAdapter } from "../apps/socket/src/postgres-adapter.js";

interface SocketRuntime {
  server: ReturnType<typeof createSocketServer>["httpServer"];
}

const runtimeScope = globalThis as typeof globalThis & { __sneakerDropSocketRuntime?: SocketRuntime };

function createRuntime(): SocketRuntime {
  const { httpServer, io } = createSocketServer(socketEnv.allowedOrigins);
  const pool = createRelayPool();
  const relayConfig = getRelayConfig();
  configurePostgresAdapter(io, pool);
  new OutboxRelay({
    pool,
    io,
    batchSize: relayConfig.batchSize,
    pollIntervalMs: relayConfig.pollIntervalMs
  }).start();
  return { server: httpServer };
}

const runtime = runtimeScope.__sneakerDropSocketRuntime ??= createRuntime();

export default runtime.server;
