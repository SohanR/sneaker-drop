import { Pool } from "pg";
import { getRelayConfig } from "./config/realtime.js";

export function createRelayPool() {
  const config = getRelayConfig();
  return new Pool({
    connectionString: config.databaseUrl,
    max: Number(process.env.SOCKET_DB_POOL_MAX || 5),
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined
  });
}

