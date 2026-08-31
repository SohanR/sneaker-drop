import { Pool } from "pg";
import { getRelayConfig } from "./config/realtime.js";

export function createRelayPool() {
  const config = getRelayConfig();
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: Number(process.env.SOCKET_DB_POOL_MAX || 5),
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined
  });
  pool.on("error", (error) => console.error("Socket PostgreSQL pool error", error));
  return pool;
}
