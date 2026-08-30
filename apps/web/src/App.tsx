import { Radio, ShieldCheck, TimerReset } from "lucide-react";
import { Button } from "./components/ui/button";

export function App() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-neutral-100">
      <section className="mx-auto max-w-5xl">
        <div className="mb-12 flex items-center gap-2 text-sm font-medium text-orange-400">
          <Radio className="size-4" aria-hidden="true" /> Live inventory platform
        </div>
        <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-7xl">The next drop lands here.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
          Real-time stock, race-safe reservations, and a fair sixty-second checkout window.
        </p>
        <Button className="mt-8" disabled>Waiting for the first drop</Button>
        <div className="mt-20 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <ShieldCheck className="mb-4 size-6 text-orange-400" aria-hidden="true" />
            <h2 className="font-bold">Atomic reservations</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">Inventory is protected at the database boundary.</p>
          </article>
          <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <TimerReset className="mb-4 size-6 text-orange-400" aria-hidden="true" />
            <h2 className="font-bold">Automatic recovery</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">Expired holds return safely to live inventory.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

