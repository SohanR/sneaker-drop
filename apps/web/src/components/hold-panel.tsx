import { Check, Clock3, LoaderCircle, ShoppingBag } from "lucide-react";
import type { ActiveHold } from "../types";
import { formatCountdown, millisecondsUntil } from "../lib/clock";
import { Button } from "./ui/button";

export function HoldPanel({ hold, offsetMs, now, purchasing, onPurchase }: {
  hold: ActiveHold;
  offsetMs: number;
  now: number;
  purchasing: boolean;
  onPurchase: (hold: ActiveHold) => void;
}) {
  const remaining = millisecondsUntil(hold.expiresAt, offsetMs, now);
  const expired = hold.status === "EXPIRED" || (hold.status === "PENDING" && remaining === 0);
  if (hold.status === "COMPLETED") {
    return <div className="flex items-center gap-2 rounded-lg border border-emerald-900/70 bg-emerald-950/40 p-3 text-sm text-emerald-300"><Check className="size-4" /> Purchase completed</div>;
  }
  if (expired) return <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-500">Hold expired</div>;
  return (
    <div className="rounded-xl border border-orange-900/70 bg-orange-950/30 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-orange-300"><Clock3 className="size-4" /> Reserved</span>
        <span className="font-mono text-base font-bold text-orange-200">{formatCountdown(remaining)}</span>
      </div>
      <Button className="mt-3 w-full" onClick={() => onPurchase(hold)} disabled={purchasing}>
        {purchasing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ShoppingBag className="mr-2 size-4" />} Complete purchase
      </Button>
    </div>
  );
}
