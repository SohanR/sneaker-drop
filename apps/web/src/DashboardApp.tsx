import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Github, LoaderCircle, LogOut, RefreshCw, ShieldCheck, TimerReset } from "lucide-react";
import type { BuyerSessionResponse, DashboardDrop, RealtimeEvent } from "@sneaker-drop/contracts";
import { Toaster, toast } from "sonner";
import { ConnectionStatus } from "./components/connection-status";
import { DropCard } from "./components/drop-card";
import { OnboardingDialog } from "./components/onboarding-dialog";
import { PurchaseDialog } from "./components/purchase-dialog";
import { Button } from "./components/ui/button";
import { useRealtime } from "./hooks/use-realtime";
import { apiErrorMessage, dashboardApi, isUnauthorized } from "./lib/api";
import { millisecondsUntil, serverOffset } from "./lib/clock";
import type { ActiveHold } from "./types";

type BuyerSession = BuyerSessionResponse["data"];
type InventoryPayload = { dropId?: string; availableStock?: number };

export function DashboardApp() {
  const [session, setSession] = useState<BuyerSession | null>();
  const [drops, setDrops] = useState<DashboardDrop[]>([]);
  const [holds, setHolds] = useState<Record<string, ActiveHold>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [creatingSession, setCreatingSession] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [reservingDropId, setReservingDropId] = useState<string>();
  const [purchaseHold, setPurchaseHold] = useState<ActiveHold | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offsetMs, setOffsetMs] = useState(0);
  const seenEvents = useRef(new Set<string>());
  const expiredNotices = useRef(new Set<string>());

  const loadDrops = useCallback(async () => {
    const nextDrops = await dashboardApi.listDrops();
    setDrops(nextDrops);
    if (nextDrops[0]) setOffsetMs(serverOffset(nextDrops[0].serverTime));
    setLoadError(undefined);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [currentSession, nextDrops] = await Promise.all([
        dashboardApi.currentSession().catch((error) => {
          if (isUnauthorized(error)) return null;
          throw error;
        }),
        dashboardApi.listDrops()
      ]);
      setSession(currentSession);
      setDrops(nextDrops);
      if (nextDrops[0]) setOffsetMs(serverOffset(nextDrops[0].serverTime));
      setLoadError(undefined);
    } catch (error) {
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    for (const hold of Object.values(holds)) {
      if (hold.status === "PENDING" && millisecondsUntil(hold.expiresAt, offsetMs, now) === 0 && !expiredNotices.current.has(hold.id)) {
        expiredNotices.current.add(hold.id);
        setHolds((current) => ({ ...current, [hold.dropId]: { ...hold, status: "EXPIRED" } }));
        toast.info("Your 60-second hold expired. Inventory is being restored.");
        void loadDrops();
      }
    }
  }, [holds, loadDrops, now, offsetMs]);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (seenEvents.current.has(event.eventId)) return;
    seenEvents.current.add(event.eventId);
    const payload = event.payload as InventoryPayload;
    if (payload.dropId && typeof payload.availableStock === "number") {
      setDrops((current) => current.map((drop) => drop.id === payload.dropId && (!event.stockVersion || event.stockVersion >= Number(drop.stockVersion))
        ? { ...drop, availableStock: payload.availableStock!, stockVersion: String(event.stockVersion ?? drop.stockVersion) }
        : drop));
    }
    void loadDrops();
  }, [loadDrops]);

  const dropIds = useMemo(() => drops.map((drop) => drop.id), [drops]);
  const connectionStatus = useRealtime(Boolean(session), dropIds, handleRealtimeEvent);
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connectionStatus === "connected" && !wasConnected.current) void loadDrops();
    wasConnected.current = connectionStatus === "connected";
  }, [connectionStatus, loadDrops]);

  const createSession = async (displayUsername: string) => {
    setCreatingSession(true);
    try {
      setSession(await dashboardApi.createSession(displayUsername));
      toast.success(`Welcome, ${displayUsername}.`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setCreatingSession(false);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await dashboardApi.logout();
      setSession(null);
      setHolds({});
      setPurchaseHold(null);
      toast.success("Session ended successfully.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  };

  const reserve = async (dropId: string) => {
    if (!session) return;
    setReservingDropId(dropId);
    try {
      const result = await dashboardApi.reserve(dropId, crypto.randomUUID());
      setOffsetMs(serverOffset(result.serverTime));
      setHolds((current) => ({ ...current, [dropId]: { id: result.id, dropId, status: result.status, expiresAt: result.expiresAt } }));
      setDrops((current) => current.map((drop) => drop.id === dropId ? { ...drop, availableStock: result.availableStock, stockVersion: result.stockVersion } : drop));
      toast.success("Reserved. You have 60 seconds to complete your purchase.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
      void loadDrops();
    } finally {
      setReservingDropId(undefined);
    }
  };

  const requestPurchase = (hold: ActiveHold) => {
    const nextHold = hold.settlementKey ? hold : { ...hold, settlementKey: crypto.randomUUID() };
    setHolds((current) => ({ ...current, [hold.dropId]: nextHold }));
    setPurchaseHold(nextHold);
  };

  const completePurchase = async () => {
    if (!purchaseHold?.settlementKey) return;
    setPurchasing(true);
    try {
      const result = await dashboardApi.complete(purchaseHold.id, purchaseHold.settlementKey);
      setOffsetMs(serverOffset(result.serverTime));
      setHolds((current) => ({ ...current, [purchaseHold.dropId]: { ...purchaseHold, status: "COMPLETED" } }));
      setPurchaseHold(null);
      toast.success("Purchase completed. The pair is yours.");
      void loadDrops();
    } catch (error) {
      const message = apiErrorMessage(error);
      if (message.toLowerCase().includes("expired")) {
        setHolds((current) => ({ ...current, [purchaseHold.dropId]: { ...purchaseHold, status: "EXPIRED" } }));
        setPurchaseHold(null);
      }
      toast.error(message);
      void loadDrops();
    } finally {
      setPurchasing(false);
    }
  };

  const selectedDrop = drops.find((drop) => drop.id === purchaseHold?.dropId);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <Toaster theme="dark" richColors position="top-right" />
      <header className="border-b border-neutral-900 bg-neutral-950/90 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div><p className="text-lg font-black tracking-tight">3-TIER DROP LAB</p><p className="text-xs text-neutral-500">Limited-drop concurrency simulation</p></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="https://github.com/SohanR/sneaker-drop" target="_blank" rel="noreferrer" aria-label="View project on GitHub" className="rounded-md border border-neutral-800 p-2 text-neutral-400 transition hover:border-neutral-700 hover:text-white"><Github className="size-4" /></a>
            {session && <span className="hidden text-sm text-neutral-400 lg:block">@{session.displayUsername}</span>}
            <ConnectionStatus status={connectionStatus} />
            {session && <Button variant="outline" className="px-3" disabled={loggingOut} onClick={() => void logout()}>{loggingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}<span className="ml-2 hidden sm:inline">Log out</span></Button>}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">Three-tier inventory MVP</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">The next drop lands here.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">Race-safe reservations, a fair sixty-second checkout window, and stock updates delivered live.</p>
        </div>

        {loading ? <DashboardSkeleton /> : loadError ? (
          <div className="rounded-2xl border border-red-950 bg-red-950/20 p-8 text-center"><p className="text-red-300">{loadError}</p><Button className="mt-4" variant="outline" onClick={() => void loadDashboard()}><RefreshCw className="mr-2 size-4" /> Try again</Button></div>
        ) : drops.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 p-12 text-center text-neutral-500">No drops are scheduled yet.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{drops.map((drop) => <DropCard key={drop.id} drop={drop} hold={holds[drop.id]} offsetMs={offsetMs} now={now} reserving={reservingDropId === drop.id} purchasing={purchasing && purchaseHold?.dropId === drop.id} onReserve={(id) => void reserve(id)} onPurchase={requestPurchase} />)}</div>
        )}

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          <Feature icon={<ShieldCheck className="size-5" />} title="Atomic reservations">PostgreSQL decides the winner at the inventory row.</Feature>
          <Feature icon={<TimerReset className="size-5" />} title="Automatic recovery">Expired holds return to stock without browser timers controlling truth.</Feature>
        </div>

        <footer className="mt-12 border-t border-neutral-900 py-8 text-center text-sm text-neutral-500">
          Developed and implemented by <a href="https://mrsohan.netlify.app/" target="_blank" rel="noreferrer" className="font-semibold text-orange-400 transition hover:text-orange-300">Md Mizanur Rahman</a>
        </footer>
      </section>

      <OnboardingDialog open={!loading && session === null} loading={creatingSession} onSubmit={createSession} />
      <PurchaseDialog hold={purchaseHold} dropName={selectedDrop?.name} loading={purchasing} onCancel={() => setPurchaseHold(null)} onConfirm={() => void completePurchase()} />
    </main>
  );
}

function DashboardSkeleton() {
  return <div aria-label="Loading drops" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-[31rem] animate-pulse rounded-2xl border border-neutral-900 bg-neutral-900/50" />)}</div>;
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-neutral-900 bg-neutral-900/40 p-5"><div className="mb-2 flex items-center gap-2 font-bold text-neutral-200"><span className="text-orange-400">{icon}</span>{title}</div><p className="text-sm leading-6 text-neutral-500">{children}</p></div>;
}
