import type { RunState } from "@/lib/schemas";

type OpsRoomControlPanelProps = {
  clock: string;
  timeRemainingSec: number;
  totalTimeSec: number;
  runState: RunState | null;
  lastBeatId: string | null;
  runLogCount: number;
  mode: "mock" | "live" | null;
  scenarioName: string;
  appliedBeatCount: number;
  totalBeatCount: number;
  lastCoachingNote: string | null;
  runEnded: boolean;
  isStarting: boolean;
  isFinalizing: boolean;
  pageError: string | null;
  isDevMode: boolean;
  canEndNow: boolean;
  onStart: () => void;
  onEndNow: () => void;
};

function chipTone(value: number | null): string {
  if (value === null) {
    return "border-zinc-600 bg-zinc-800 text-zinc-300";
  }
  if (value >= 70) {
    return "border-emerald-700/70 bg-emerald-950/40 text-emerald-200";
  }
  if (value >= 45) {
    return "border-amber-700/70 bg-amber-950/40 text-amber-200";
  }
  return "border-rose-700/70 bg-rose-950/40 text-rose-200";
}

export function OpsRoomControlPanel({
  clock,
  timeRemainingSec,
  totalTimeSec,
  runState,
  lastBeatId,
  runLogCount,
  mode,
  scenarioName,
  appliedBeatCount,
  totalBeatCount,
  lastCoachingNote,
  runEnded,
  isStarting,
  isFinalizing,
  pageError,
  isDevMode,
  canEndNow,
  onStart,
  onEndNow,
}: OpsRoomControlPanelProps) {
  const timeProgress = Math.round((Math.max(0, timeRemainingSec) / Math.max(1, totalTimeSec)) * 100);
  const beatProgress =
    totalBeatCount > 0 ? Math.round((Math.max(0, appliedBeatCount) / Math.max(1, totalBeatCount)) * 100) : 0;
  const readinessValue = runState?.readinessScore ?? 0;
  const coachingPreview =
    !lastCoachingNote || lastCoachingNote.trim().length === 0
      ? "No coaching note yet."
      : lastCoachingNote.length > 80
        ? `${lastCoachingNote.slice(0, 77)}...`
        : lastCoachingNote;

  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900/95 p-5 shadow-[0_22px_50px_-30px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">War Room</p>
          <h1 className="mt-2 text-2xl font-semibold">Kobayashi Simulator</h1>
          <p className="mt-1 text-sm text-zinc-300">Live decision loop for {scenarioName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={isStarting || isFinalizing}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting ? "Initializing..." : "Start PR Meltdown"}
          </button>
          {isDevMode ? (
            <button
              type="button"
              onClick={onEndNow}
              disabled={!canEndNow || isFinalizing}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              End Now (Dev)
            </button>
          ) : null}
          <div className="rounded-full border border-zinc-700 bg-zinc-900 p-2">
            <div
              className="grid h-14 w-14 place-items-center rounded-full border border-zinc-700 bg-zinc-950 text-xs font-semibold text-zinc-200"
              style={{
                backgroundImage: `conic-gradient(${readinessValue >= 65 ? "#22d3ee" : readinessValue >= 40 ? "#f59e0b" : "#f43f5e"} ${readinessValue}%, #27272a ${readinessValue}% 100%)`,
              }}
            >
              <span className="rounded-full bg-zinc-950 px-2 py-1">{readinessValue}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-5">
        <p className="rounded-lg border border-cyan-700/70 bg-cyan-950/40 px-3 py-2 font-mono text-cyan-100">
          SLA Clock: <span className="font-semibold">{clock}</span>
        </p>
        <p className={`rounded-lg border px-3 py-2 ${chipTone(runState?.readinessScore ?? null)}`}>
          Readiness: <span className="font-semibold">{runState?.readinessScore ?? "--"}</span>
        </p>
        <p className={`rounded-lg border px-3 py-2 ${chipTone(runState?.publicSentiment ?? null)}`}>
          Sentiment: <span className="font-semibold">{runState?.publicSentiment ?? "--"}</span>
        </p>
        <p className={`rounded-lg border px-3 py-2 ${chipTone(runState?.trustScore ?? null)}`}>
          Trust: <span className="font-semibold">{runState?.trustScore ?? "--"}</span>
        </p>
        <p className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200">
          Last Beat: <span className="font-semibold">{lastBeatId ?? "none"}</span>
        </p>
      </div>

      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-4">
        <p className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200">
          Mode: <span className="font-semibold uppercase">{mode ?? "--"}</span>
        </p>
        <p className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200">
          Beats: <span className="font-semibold">{appliedBeatCount} / {totalBeatCount}</span>
        </p>
        <p className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200">
          Run Log Events: <span className="font-semibold">{runLogCount}</span>
        </p>
        <p className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 sm:col-span-4">
          Last Coaching Note: <span className="font-semibold">{coachingPreview}</span>
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-2.5">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
            <span>Clock Progress</span>
            <span>{timeProgress}% remaining</span>
          </div>
          <div className="h-2 rounded bg-zinc-700">
            <div
              className={`h-2 rounded transition-all duration-500 ${
                timeProgress > 35 ? "bg-cyan-500" : timeProgress > 15 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-2.5">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-300">
            <span>Beat Progress</span>
            <span>{beatProgress}% complete</span>
          </div>
          <div className="h-2 rounded bg-zinc-700">
            <div className="h-2 rounded bg-emerald-500 transition-all duration-500" style={{ width: `${beatProgress}%` }} />
          </div>
        </div>
      </div>

      {runEnded ? (
        <p className="mt-3 rounded-lg border border-amber-700/80 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {isFinalizing ? "Timer expired. Generating After-Action Report..." : "Timer expired. Action submission is disabled."}
        </p>
      ) : null}

      {isFinalizing && !runEnded ? (
        <p className="mt-3 rounded-lg border border-amber-700/80 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          Ending run now. Generating After-Action Report...
        </p>
      ) : null}

      {pageError ? (
        <p className="mt-3 rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{pageError}</p>
      ) : null}
    </section>
  );
}
