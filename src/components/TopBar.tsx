"use client";

type TopBarProps = {
  timeRemainingSec: number;
  readinessScore: number | null;
  publicSentiment: number | null;
  trustScore: number | null;
};

function formatClock(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function chipTone(value: number | null): string {
  if (value === null) {
    return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }
  if (value >= 70) {
    return "bg-emerald-950/60 text-emerald-200 border-emerald-700/60";
  }
  if (value >= 45) {
    return "bg-amber-950/60 text-amber-200 border-amber-700/60";
  }
  return "bg-red-950/60 text-red-200 border-red-700/60";
}

export default function TopBar({
  timeRemainingSec,
  readinessScore,
  publicSentiment,
  trustScore,
}: TopBarProps) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Crisis Ops Board</p>
          <h2 className="text-base font-semibold text-zinc-100">PR Meltdown Command View</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="rounded-md border border-cyan-700/60 bg-cyan-950/50 px-3 py-1.5 font-mono text-cyan-100">
            SLA Clock {formatClock(Math.max(0, timeRemainingSec))}
          </div>

          <div className={`rounded-md border px-3 py-1.5 ${chipTone(readinessScore)}`}>
            Readiness {readinessScore ?? "--"}
          </div>

          <div className={`rounded-md border px-3 py-1.5 ${chipTone(publicSentiment)}`}>
            Sentiment {publicSentiment ?? "--"}
          </div>

          <div className={`rounded-md border px-3 py-1.5 ${chipTone(trustScore)}`}>
            Trust {trustScore ?? "--"}
          </div>
        </div>
      </div>
    </section>
  );
}
