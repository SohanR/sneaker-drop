export interface SettlementResponse {
  data: {
    id: string;
    dropId: string;
    status: "COMPLETED";
    completedAt: string;
    serverTime: string;
    idempotentReplay: boolean;
  };
}

export interface ExpirationSweepResponse {
  data: {
    expiredCount: number;
    batchesProcessed: number;
    hasMore: boolean;
  };
}
