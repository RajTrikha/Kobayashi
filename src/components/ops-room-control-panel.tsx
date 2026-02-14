import type { RunState } from "@/lib/schemas";

type OpsRoomControlPanelProps = {
  clock: string;
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

export function OpsRoomControlPanel({
  clock,
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
  const coachingPreview =
    !lastCoachingNote || lastCoachingNote.trim().length === 0
      ? "No coaching note yet."
      : lastCoachingNote.length > 80
        ? `${lastCoachingNote.slice(0, 77)}...`
        : lastCoachingNote;

  return (
    <section className="rounded border border-zinc-700 bg-zinc-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Kobayashi Simulator</h1>
          <p className="text-sm text-zinc-300">PR Meltdown loop (minimal working build)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={isStarting || isFinalizing}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting ? "Starting..." : "Start PR Meltdown"}
          </button>
          {isDevMode ? (
            <button
              type="button"
              onClick={onEndNow}
              disabled={!canEndNow || isFinalizing}
              className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              End Now (Dev)
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Clock: <span className="font-semibold">{clock}</span>
        </p>
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Readiness: <span className="font-semibold">{runState?.readinessScore ?? "--"}</span>
        </p>
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Sentiment / Trust:{" "}
          <span className="font-semibold">{runState ? `${runState.publicSentiment} / ${runState.trustScore}` : "--"}</span>
        </p>
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Last Beat: <span className="font-semibold">{lastBeatId ?? "none"}</span>
        </p>
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Run Log Events: <span className="font-semibold">{runLogCount}</span>
        </p>
      </div>

      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-4">
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Mode: <span className="font-semibold uppercase">{mode ?? "--"}</span>
        </p>
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Scenario: <span className="font-semibold">{scenarioName}</span>
        </p>
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
          Beats:{" "}
          <span className="font-semibold">
            {appliedBeatCount} / {totalBeatCount}
          </span>
        </p>
        <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 sm:col-span-4">
          Last Coaching Note: <span className="font-semibold">{coachingPreview}</span>
        </p>
      </div>

      {runEnded ? (
        <p className="mt-3 rounded border border-yellow-700 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-200">
          {isFinalizing
            ? "Timer expired. Generating After-Action Report..."
            : "Timer expired. Action submission is now disabled."}
        </p>
      ) : null}
      {isFinalizing && !runEnded ? (
        <p className="mt-3 rounded border border-yellow-700 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-200">
          Ending run now. Generating After-Action Report...
        </p>
      ) : null}

      {pageError ? (
        <p className="mt-3 rounded border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-200">{pageError}</p>
      ) : null}
    </section>
  );
}
