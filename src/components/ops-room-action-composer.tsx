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
    <section className="glass-panel p-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">Command Console</h2>
      <p className="mt-1 mb-3 text-[11px] uppercase tracking-[0.12em] text-amber-300/90">
        Your Decision Input · Not a chat window
      </p>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.holdingStatement)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-cyan-700/40 bg-cyan-950/20 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-cyan-300 transition hover:border-cyan-600/60 hover:bg-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Draft Holding Statement
        </button>
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.dmReporter)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-sky-700/40 bg-sky-950/20 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-sky-300 transition hover:border-sky-600/60 hover:bg-sky-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          DM Reporter
        </button>
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.internalMemo)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-emerald-300 transition hover:border-emerald-600/60 hover:bg-emerald-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Internal Memo
        </button>
        <button
          type="button"
          onClick={() => onActionTextChange(ACTION_TEMPLATES.escalate)}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
          className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-amber-300 transition hover:border-amber-600/60 hover:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Escalate
        </button>
      </div>

      <form id="action-composer-form" onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={actionText}
          onChange={(event) => onActionTextChange(event.target.value.slice(0, 220))}
          placeholder="Write your next command decision (e.g., public statement direction, legal-safe escalation, support action)..."
          className="h-28 w-full rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-2 text-sm text-zinc-200 outline-none transition focus:border-cyan-600/60 focus:ring-2 focus:ring-cyan-500/30"
          style={{ boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)" }}
          disabled={!hasEpisode || isSubmitting || isFinalizing || runEnded}
        />
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${actionCharsLeft < 40 ? "glow-text-amber text-amber-400" : "text-zinc-500"}`}>
            {actionCharsLeft} characters left · Evaluated by simulator engine · Submit with Ctrl/Cmd + Enter
          </p>
          <button
            type="submit"
            disabled={!hasEpisode || isSubmitting || isFinalizing || actionText.trim().length === 0 || runEnded}
            className="glow-btn-cyan rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? "Submitting..." : "Submit Decision"}
          </button>
        </div>
      </form>

      {lastEvaluation ? (
        <div className="animate-fade-in-up mt-4 rounded-lg border border-l-2 border-zinc-700/40 border-l-cyan-500/60 bg-zinc-800/30 p-3 text-sm">
          <p>
            <span className="glow-text-cyan font-bold text-cyan-400">Score Delta:</span> {lastEvaluation.scoreDelta}
          </p>
          <p className="mt-1">
            <span className="glow-text-cyan font-bold text-cyan-400">State Delta:</span> sentiment {lastEvaluation.stateDelta.publicSentiment}, trust{" "}
            {lastEvaluation.stateDelta.trustScore}
          </p>
          <p className="mt-1">
            <span className="glow-text-cyan font-bold text-cyan-400">Coach:</span> {lastEvaluation.coachingNote}
          </p>
          {lastEvaluation.suggestedNextAction ? (
            <p className="mt-1">
              <span className="glow-text-cyan font-bold text-cyan-400">Suggested Next:</span> {lastEvaluation.suggestedNextAction}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
