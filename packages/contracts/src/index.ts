export * from "./api.js";
export * from "./reservation.js";

export interface HealthResponse {
  status: "ok";
  service: "api" | "socket";
  timestamp: string;
  version: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export interface RealtimeEvent<TPayload = unknown> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  stockVersion?: number;
  payload: TPayload;
}
