import { Wifi, WifiOff } from "lucide-react";
import type { ConnectionStatus as Status } from "../hooks/use-realtime";

export function ConnectionStatus({ status }: { status: Status }) {
  const connected = status === "connected";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${connected ? "border-emerald-900 bg-emerald-950/60 text-emerald-400" : "border-neutral-800 bg-neutral-900 text-neutral-400"}`}>
      {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {connected ? "Live" : status === "connecting" ? "Connecting" : "Reconnecting"}
    </div>
  );
}
