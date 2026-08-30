export interface ReservationResponse {
  data: {
    id: string;
    dropId: string;
    status: "PENDING" | "COMPLETED" | "EXPIRED";
    expiresAt: string;
    availableStock: number;
    stockVersion: string;
    serverTime: string;
    idempotentReplay: boolean;
  };
}
