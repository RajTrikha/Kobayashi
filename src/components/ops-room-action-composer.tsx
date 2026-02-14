import type { FormEventHandler } from "react";

import type { EvaluateEpisodeResponse } from "@/lib/schemas";

const ACTION_TEMPLATES = {
  holdingStatement:
    "We understand the disruption and are assisting affected customers while we verify all operational details.",
  dmReporter:
    "Thanks for reaching out. We are validating facts now and will share a confirmed update with customer support steps shortly.",
  internalMemo:
    "Team: align on one approved external line, route legal-sensitive language for review, and sync every 20 minutes.",
  escalate:
    "Escalating to executive leadership and legal now. Need rapid approval on customer support commitments and media response timing.",
} as const;

type OpsRoomActionComposerProps = {
  actionText: string;
  actionCharsLeft: number;
  hasEpisode: boolean;
  isSubmitting: boolean;
  isFinalizing: boolean;
  runEnded: boolean;
  lastEvaluation: EvaluateEpisodeResponse | null;
  onActionTextChange: (nextAction: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function OpsRoomActionComposer({
  actionText,
  actionCharsLeft,
  hasEpisode,
  isSubmitting,
  isFinalizing,
  runEnded,
  lastEvaluation,
  onActionTextChange,
  onSubmit,
}: OpsRoomActionComposerProps) {
  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Action Composer</h2>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.holdingStatement)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-cyan-700/70 bg-cyan-950/30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Draft Holding Statement
        </button>
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.dmReporter)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-sky-700/70 bg-sky-950/30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          DM Reporter
        </button>
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.internalMemo)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-emerald-700/70 bg-emerald-950/30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Internal Memo
        </button>
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.escalate)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Escalate
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={actionText}
          onChange={(event) => onActionTextChange(event.target.value.slice(0, 220))}
          placeholder="Write your next response..."
          className="h-28 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none ring-cyan-500/60 focus:ring-2"
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
        />
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${actionCharsLeft < 40 ? "text-amber-300" : "text-zinc-400"}`}>{actionCharsLeft} characters left</p>
          <button
            type="submit"
            disabled={!hasEpisode || isSubmitting || isFinalizing || actionText.trim().length === 0 || runEnded}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Action"}
          </button>
        </div>
      </form>

      {lastEvaluation ? (
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/80 p-3 text-sm">
          <p>
            <span className="font-semibold text-cyan-300">Score Delta:</span> {lastEvaluation.scoreDelta}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-cyan-300">State Delta:</span> sentiment {lastEvaluation.stateDelta.publicSentiment}, trust{" "}
            {lastEvaluation.stateDelta.trustScore}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-cyan-300">Coach:</span> {lastEvaluation.coachingNote}
          </p>
          {lastEvaluation.suggestedNextAction ? (
            <p className="mt-1">
              <span className="font-semibold text-cyan-300">Suggested Next:</span> {lastEvaluation.suggestedNextAction}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
