import "./load-env.js";

export function getCronConfig() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") throw new Error("CRON_SECRET is required in production");
  if (secret && process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("CRON_SECRET must be at least 32 characters in production");
  }
  const batchSize = Number(process.env.SWEEPER_BATCH_SIZE || 100);
  const maxBatches = Number(process.env.SWEEPER_MAX_BATCHES || 10);
  if (!Number.isInteger(batchSize) || batchSize <= 0) throw new Error("SWEEPER_BATCH_SIZE must be a positive integer");
  if (!Number.isInteger(maxBatches) || maxBatches <= 0) throw new Error("SWEEPER_MAX_BATCHES must be a positive integer");
  return { secret: secret || "development-only-cron-secret-change-me", batchSize, maxBatches };
}
