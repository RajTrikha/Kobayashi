import { useMemo, useState } from "react";

import type { AfterActionRequest } from "@/lib/schemas";

type RunLogEntry = AfterActionRequest["runLog"][number];

type OpsRoomActivityLogProps = {
  runLog: RunLogEntry[];
};

function eventTheme(type: RunLogEntry["type"]): string {
  switch (type) {
    case "beat":
      return "border-cyan-700/70 bg-cyan-950/30 text-cyan-200";
    case "action":
      return "border-emerald-700/70 bg-emerald-950/30 text-emerald-200";
    case "evaluation":
      return "border-indigo-700/70 bg-indigo-950/30 text-indigo-200";
    default:
      return "border-amber-700/70 bg-amber-950/30 text-amber-200";
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
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Activity Timeline</h2>
          <p className="mt-1 text-xs text-zinc-400">Every beat and action event in chronological trace.</p>
        </div>
        <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
          {runLog.length} events
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(["all", "beat", "action", "evaluation", "system"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setTypeFilter(filter)}
            className={`rounded-md border px-2 py-1 uppercase tracking-wide transition ${
              typeFilter === filter
                ? "border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-100"
                : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <ul className="max-h-[18rem] space-y-2 overflow-y-auto pr-1 text-sm">
        {visibleEvents.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 p-3 text-zinc-400">
            No events for this filter.
          </li>
        ) : null}

        {visibleEvents.map((event, index) => (
          <li key={`${event.ts}-${event.type}-${index}`} className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${eventTheme(event.type)}`}>
                {event.type}
              </span>
              <span className="text-xs text-zinc-400">{formatTime(event.ts)}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-100">{event.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
