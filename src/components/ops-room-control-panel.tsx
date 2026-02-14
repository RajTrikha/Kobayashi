import type { RunState } from "@/lib/schemas";

type OpsRoomControlPanelProps = {
  clock: string;
  timeRemainingSec: number;
  totalTimeSec: number;
  runState: RunState | null;
  initialRunState: RunState | null;
  hasEpisode: boolean;
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
  onStartStandard: () => void;
  onStartJudgeDemo: () => void;
  onEndNow: () => void;
};

function chipTone(value: number | null): string {
  if (value === null) {
    return "border-zinc-700/50 bg-zinc-800/50 text-zinc-400";
  }
  if (value >= 70) {
    return "border-emerald-700/60 bg-emerald-950/30 text-emerald-300 glow-border-cyan";
  }
  if (value >= 45) {
    return "border-amber-700/60 bg-amber-950/30 text-amber-300 glow-border-amber";
  }
  return "border-rose-700/60 bg-rose-950/30 text-rose-300 glow-border-red";
}

export function OpsRoomControlPanel({
  clock,
  timeRemainingSec,
  totalTimeSec,
  runState,
  initialRunState,
  hasEpisode,
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
  onStartStandard,
  onStartJudgeDemo,
  onEndNow,
}: OpsRoomControlPanelProps) {
  const displayState = runState ?? initialRunState;
  const timeProgress = Math.round((Math.max(0, timeRemainingSec) / Math.max(1, totalTimeSec)) * 100);
  const beatProgress =
    totalBeatCount > 0 ? Math.round((Math.max(0, appliedBeatCount) / Math.max(1, totalBeatCount)) * 100) : 0;
  const readinessValue = displayState?.readinessScore ?? 0;
  const coachingPreview =
    !lastCoachingNote || lastCoachingNote.trim().length === 0
      ? "No coaching note yet."
      : lastCoachingNote.length > 80
        ? `${lastCoachingNote.slice(0, 77)}...`
        : lastCoachingNote;
  const lastBeatLabel = lastBeatId ?? (hasEpisode ? "pending" : "none");

  const isTimeLow = timeRemainingSec > 0 && timeRemainingSec <= 60;

  return (
    <section className="glass-panel glass-panel-cyan p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="glow-text-cyan text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">War Room</p>
          <h1 className="mt-2 text-2xl font-bold">Kobayashi Simulator</h1>
          <p className="mt-1 text-sm text-zinc-400">Live decision loop for {scenarioName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStartStandard}
            disabled={isStarting || isFinalizing}
            className="glow-btn-red rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting ? "Initializing..." : "Start Standard"}
          </button>
          <button
            type="button"
            onClick={onStartJudgeDemo}
            disabled={isStarting || isFinalizing}
            className="rounded-lg border border-cyan-600/60 bg-cyan-950/40 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-cyan-200 transition hover:border-cyan-500 hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting ? "Initializing..." : "Live Simulation (Judges · 90s)"}
          </button>
          {isDevMode ? (
            <button
              type="button"
              onClick={onEndNow}
              disabled={!canEndNow || isFinalizing}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              End Now (Dev)
            </button>
          ) : null}
          <div className="rounded-full border border-zinc-700/50 bg-zinc-900/50 p-2">
            <div
              className="grid h-14 w-14 place-items-center rounded-full border border-zinc-700/50 text-xs font-bold text-zinc-200"
              style={{
                backgroundImage: `conic-gradient(${readinessValue >= 65 ? "#22d3ee" : readinessValue >= 40 ? "#f59e0b" : "#f43f5e"} ${readinessValue}%, rgba(39,39,42,0.5) ${readinessValue}% 100%)`,
                boxShadow: `0 0 20px ${readinessValue >= 65 ? "rgba(6,182,212,0.2)" : readinessValue >= 40 ? "rgba(245,158,11,0.2)" : "rgba(244,63,94,0.2)"}`,
              }}
            >
              <span className="rounded-full bg-zinc-950 px-2 py-1">{readinessValue}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-5">
        <p className={`rounded-lg border border-cyan-700/50 bg-cyan-950/30 px-3 py-2 font-mono text-cyan-200 ${isTimeLow ? "animate-glow" : "glow-border-cyan"}`}>
          SLA Clock: <span className="font-bold">{clock}</span>
        </p>
        <p className={`rounded-lg border px-3 py-2 ${chipTone(displayState?.readinessScore ?? null)}`}>
          Readiness: <span className="font-bold">{displayState?.readinessScore ?? "--"}</span>
        </p>
        <p className={`rounded-lg border px-3 py-2 ${chipTone(displayState?.publicSentiment ?? null)}`}>
          Sentiment: <span className="font-bold">{displayState?.publicSentiment ?? "--"}</span>
        </p>
        <p className={`rounded-lg border px-3 py-2 ${chipTone(displayState?.trustScore ?? null)}`}>
          Trust: <span className="font-bold">{displayState?.trustScore ?? "--"}</span>
        </p>
        <p className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-3 py-2 text-zinc-300">
          Last Beat: <span className="font-bold">{lastBeatLabel}</span>
        </p>
      </div>

      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-4">
        <p className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-3 py-2 text-zinc-300">
          Mode: <span className="font-bold uppercase">{mode ?? "--"}</span>
        </p>
        <p className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-3 py-2 text-zinc-300">
          Beats: <span className="font-bold">{appliedBeatCount} / {totalBeatCount}</span>
        </p>
        <p className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-3 py-2 text-zinc-300">
          Run Log Events: <span className="font-bold">{runLogCount}</span>
        </p>
        <p className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-3 py-2 text-zinc-300 sm:col-span-4">
          Last Coaching Note: <span className="font-bold">{coachingPreview}</span>
        </p>
      </div>

      {!hasEpisode ? (
        <p className="mt-2 text-xs text-zinc-500">Click a start button to initialize simulation metrics.</p>
      ) : !lastBeatId ? (
        <p className="mt-2 text-xs text-zinc-500">Simulation initialized. Waiting for first beat...</p>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-2.5">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
            <span>Clock Progress</span>
            <span>{timeProgress}% remaining</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-700/50">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                timeProgress > 35 ? "bg-cyan-500" : timeProgress > 15 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{
                width: `${timeProgress}%`,
                boxShadow: `0 0 8px ${timeProgress > 35 ? "rgba(6,182,212,0.4)" : timeProgress > 15 ? "rgba(245,158,11,0.4)" : "rgba(244,63,94,0.4)"}`,
              }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-2.5">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
            <span>Beat Progress</span>
            <span>{beatProgress}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-700/50">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${beatProgress}%`,
                boxShadow: "0 0 8px rgba(16,185,129,0.4)",
              }}
            />
          </div>
        </div>
      </div>

      {runEnded ? (
        <p className="animate-fade-in-up mt-3 rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300 glow-border-amber">
          {isFinalizing ? "Timer expired. Generating After-Action Report..." : "Timer expired. Action submission is disabled."}
        </p>
      ) : null}

      {isFinalizing && !runEnded ? (
        <p className="animate-fade-in-up mt-3 rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300 glow-border-amber">
          Ending run now. Generating After-Action Report...
        </p>
      ) : null}

      {pageError ? (
        <p className="animate-fade-in-up mt-3 rounded-lg border border-rose-700/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-300 glow-border-red">{pageError}</p>
      ) : null}
    </section>
  );
}
