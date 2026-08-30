export interface ActiveHold {
  id: string;
  dropId: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  expiresAt: string;
  settlementKey?: string;
}

