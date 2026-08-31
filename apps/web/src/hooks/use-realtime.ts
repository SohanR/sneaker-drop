import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { RealtimeEvent } from "@sneaker-drop/contracts";
import { REALTIME_EVENTS } from "@sneaker-drop/contracts";
import { dashboardApi } from "../lib/api";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected";

export function useRealtime(enabled: boolean, dropIds: string[], onEvent: (event: RealtimeEvent) => void) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    let disposed = false;
    let socket: Socket | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      setStatus("connecting");
      try {
        const { token } = await dashboardApi.realtimeToken();
        if (disposed) return;
        const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");
        socket = io(socketUrl, {
          path: "/socket.io",
          auth: { token },
          transports: ["websocket"],
          withCredentials: true
        });
        socket.on("connect", () => {
          setStatus("connected");
          dropIds.forEach((dropId) => socket?.emit(REALTIME_EVENTS.subscribe, dropId));
        });
        socket.on("disconnect", () => setStatus("disconnected"));
        socket.on("connect_error", (error) => {
          setStatus("disconnected");
          if (error.message === "UNAUTHORIZED") {
            socket?.disconnect();
            retryTimer = setTimeout(() => void connect(), 1000);
          }
        });
        socket.on(REALTIME_EVENTS.inventory, (event: RealtimeEvent) => callbackRef.current(event));
      } catch {
        if (!disposed) {
          setStatus("disconnected");
          retryTimer = setTimeout(() => void connect(), 2000);
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.disconnect();
    };
  }, [enabled, dropIds.join(",")]);

  return status;
}
