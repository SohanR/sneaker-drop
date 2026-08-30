import "./load-env.js";

function requiredSecret() {
  const value = process.env.SOCKET_AUTH_SECRET?.trim();
  if (!value && process.env.NODE_ENV === "production") throw new Error("SOCKET_AUTH_SECRET is required in production");
  if (value && process.env.NODE_ENV === "production" && value.length < 32) {
    throw new Error("SOCKET_AUTH_SECRET must be at least 32 characters in production");
  }
  return value || "development-only-socket-secret-change-me";
}

export function getSocketAuthConfig() {
  return {
    secret: requiredSecret(),
    issuer: process.env.SOCKET_TOKEN_ISSUER?.trim() || "sneaker-drop-api",
    audience: process.env.SOCKET_TOKEN_AUDIENCE?.trim() || "sneaker-drop-socket"
  };
}

export function getRelayConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required by the outbox relay");
  const batchSize = Number(process.env.OUTBOX_BATCH_SIZE || 100);
  const pollIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 250);
  if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error("OUTBOX_BATCH_SIZE must be a positive integer");
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 50) throw new Error("OUTBOX_POLL_INTERVAL_MS must be at least 50");
  return { databaseUrl, batchSize, pollIntervalMs, ssl: process.env.DB_SSL !== "false" };
}
