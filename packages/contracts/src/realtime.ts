export interface RealtimeTokenResponse {
  data: { token: string; expiresIn: number };
}

export interface SocketReadyEvent {
  connectedAt: string;
  buyerSessionId: string;
}

export interface DropSubscriptionAck {
  ok: boolean;
}

export const REALTIME_EVENTS = {
  ready: "system:ready",
  inventory: "inventory:event",
  drop: "drop:event",
  subscribe: "drop:subscribe",
  unsubscribe: "drop:unsubscribe"
} as const;
