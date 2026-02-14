import { useMemo, useState } from "react";

import type { AfterActionRequest } from "@/lib/schemas";

type RunLogEntry = AfterActionRequest["runLog"][number];

type OpsRoomActivityLogProps = {
  runLog: RunLogEntry[];
};

function eventTheme(type: RunLogEntry["type"]): string {
  switch (type) {
    case "beat":
      return "border-cyan-700/50 bg-cyan-950/20 text-cyan-300";
    case "action":
      return "border-emerald-700/50 bg-emerald-950/20 text-emerald-300";
    case "evaluation":
      return "border-indigo-700/50 bg-indigo-950/20 text-indigo-300";
    default:
      return "border-amber-700/50 bg-amber-950/20 text-amber-300";
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function OpsRoomActivityLog({ runLog }: OpsRoomActivityLogProps) {
  const [typeFilter, setTypeFilter] = useState<RunLogEntry["type"] | "all">("all");

  const visibleEvents = useMemo(() => {
    const filtered =
      typeFilter === "all" ? runLog : runLog.filter((event) => event.type === typeFilter);

    return [...filtered].reverse();
  }, [runLog, typeFilter]);

  return (
    <section className="glass-panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">Activity Timeline</h2>
          <p className="mt-1 text-xs text-zinc-500">Every beat and action event in chronological trace.</p>
        </div>
        <span className="rounded-md border border-zinc-700/50 bg-zinc-800/40 px-2 py-1 text-xs font-bold text-zinc-400">
          {runLog.length} events
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(["all", "beat", "action", "evaluation", "system"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setTypeFilter(filter)}
            className={`rounded-md border px-2 py-1 font-bold uppercase tracking-wide transition ${
              typeFilter === filter
                ? "glow-border-cyan border-fuchsia-500/60 bg-fuchsia-950/30 text-fuchsia-300"
                : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500/60 hover:text-zinc-300"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <ul className="max-h-[18rem] space-y-2 overflow-y-auto pr-1 text-sm">
        {visibleEvents.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-700/40 bg-zinc-800/20 p-3 text-zinc-500">
            No events for this filter.
          </li>
        ) : null}

        {visibleEvents.map((event, index) => (
          <li key={`${event.ts}-${event.type}-${index}`} className="animate-fade-in-up rounded-lg border border-zinc-700/40 bg-zinc-800/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-bold uppercase ${eventTheme(event.type)}`}>
                {event.type}
              </span>
              <span className="font-mono text-xs text-zinc-500">{formatTime(event.ts)}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-200">{event.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
