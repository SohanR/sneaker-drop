import { getDatabase } from "../config/database.js";
import { getCronConfig } from "../config/cron.js";
import { expireOverdueReservations } from "./drop-service.js";

export async function sweepExpiredReservations() {
  const { batchSize, maxBatches } = getCronConfig();
  let expiredCount = 0;
  let batchesProcessed = 0;
  let lastBatchCount = 0;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    lastBatchCount = await getDatabase().transaction((transaction) => expireOverdueReservations(batchSize, transaction));
    batchesProcessed += 1;
    expiredCount += lastBatchCount;
    if (lastBatchCount < batchSize) break;
  }

  return { expiredCount, batchesProcessed, hasMore: lastBatchCount === batchSize };
}

