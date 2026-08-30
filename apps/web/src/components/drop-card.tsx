import { LoaderCircle, PackageCheck, Radio, Users } from "lucide-react";
import type { DashboardDrop } from "@sneaker-drop/contracts";
import type { ActiveHold } from "../types";
import { formatCountdown, formatPrice, millisecondsUntil } from "../lib/clock";
import { HoldPanel } from "./hold-panel";
import { Button } from "./ui/button";

interface DropCardProps {
  drop: DashboardDrop;
  hold?: ActiveHold;
  offsetMs: number;
  now: number;
  reserving: boolean;
  purchasing: boolean;
  onReserve: (dropId: string) => void;
  onPurchase: (hold: ActiveHold) => void;
}

export function DropCard({ drop, hold, offsetMs, now, reserving, purchasing, onReserve, onPurchase }: DropCardProps) {
  const untilStart = millisecondsUntil(drop.startsAt, offsetMs, now);
  const started = untilStart === 0;
  const soldOut = drop.availableStock === 0;
  const pendingHold = hold?.status === "PENDING" && millisecondsUntil(hold.expiresAt, offsetMs, now) > 0;

  return (
    <article className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-xl shadow-black/10">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-950">
        {drop.imageUrl ? <img src={drop.imageUrl} alt={drop.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : (
          <div className="flex h-full items-center justify-center"><PackageCheck className="size-16 text-neutral-700" aria-hidden="true" /></div>
        )}
        <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs font-semibold backdrop-blur">
          {started ? <span className="flex items-center gap-1.5 text-emerald-300"><Radio className="size-3" /> Live</span> : `Starts in ${formatCountdown(untilStart)}`}
        </span>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-black tracking-tight text-white">{drop.name}</h2>
            <span className="shrink-0 font-bold text-orange-300">{formatPrice(drop.price, drop.currency)}</span>
          </div>
          {drop.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-400">{drop.description}</p>}
        </div>

        <div className="flex items-end justify-between rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
          <div><p className="text-xs uppercase tracking-widest text-neutral-500">Available</p><p className="mt-1 text-3xl font-black text-white">{drop.availableStock}</p></div>
          <p className="text-xs text-neutral-500">of {drop.totalStock}</p>
        </div>

        {hold ? <HoldPanel hold={hold} offsetMs={offsetMs} now={now} purchasing={purchasing} onPurchase={onPurchase} /> : (
          <Button className="h-11 w-full" disabled={!started || soldOut || reserving} onClick={() => onReserve(drop.id)}>
            {reserving && <LoaderCircle className="mr-2 size-4 animate-spin" />}
            {!started ? "Drop not started" : soldOut ? "Sold out" : "Reserve for 60 seconds"}
          </Button>
        )}

        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"><Users className="size-4" /> Recent buyers</p>
          {drop.recentPurchasers.length ? (
            <ol className="space-y-2">{drop.recentPurchasers.slice(0, 3).map((buyer, index) => (
              <li key={`${buyer.displayUsername}-${buyer.completedAt}`} className="flex items-center gap-3 text-sm text-neutral-300"><span className="flex size-6 items-center justify-center rounded-full bg-neutral-800 text-xs text-neutral-500">{index + 1}</span>{buyer.displayUsername}</li>
            ))}</ol>
          ) : <p className="text-sm text-neutral-600">No purchases yet. Be the first.</p>}
        </div>
      </div>
    </article>
  );
}
