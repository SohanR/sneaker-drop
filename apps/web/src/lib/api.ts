import axios, { AxiosError } from "axios";
import type {
  ApiErrorResponse,
  BuyerSessionResponse,
  DashboardDropsResponse,
  RealtimeTokenResponse,
  ReservationResponse,
  SettlementResponse
} from "@sneaker-drop/contracts";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1",
  withCredentials: true,
  timeout: 10_000
});

export const dashboardApi = {
  currentSession: () => api.get<BuyerSessionResponse>("/sessions/current").then((response) => response.data.data),
  createSession: (displayUsername: string) => api.post<BuyerSessionResponse>("/sessions", { displayUsername }).then((response) => response.data.data),
  logout: () => api.delete("/sessions/current"),
  listDrops: () => api.get<DashboardDropsResponse>("/drops").then((response) => response.data.data),
  reserve: (dropId: string, idempotencyKey: string) => api.post<ReservationResponse>(
    `/drops/${dropId}/reservations`, {}, { headers: { "Idempotency-Key": idempotencyKey } }
  ).then((response) => response.data.data),
  complete: (reservationId: string, idempotencyKey: string) => api.post<SettlementResponse>(
    `/reservations/${reservationId}/complete`, {}, { headers: { "Idempotency-Key": idempotencyKey } }
  ).then((response) => response.data.data),
  realtimeToken: () => api.post<RealtimeTokenResponse>("/realtime/token").then((response) => response.data.data)
};

export function apiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const response = error.response?.data as ApiErrorResponse | undefined;
    if (response?.error?.message) return response.error.message;
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export function isUnauthorized(error: unknown) {
  return error instanceof AxiosError && error.response?.status === 401;
}
