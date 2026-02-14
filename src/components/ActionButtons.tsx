"use client";

const ACTION_TEMPLATES = {
  holdingStatement:
    "We understand the disruption and are actively assisting affected customers while we verify all operational details.",
  dmReporter:
    "Thanks for reaching out. We are validating facts now and will provide a confirmed update with customer support steps shortly.",
  internalMemo:
    "Team: align on one approved external line, route legal-sensitive language for review, and sync every 20 minutes.",
  escalate:
    "Escalating to executive leadership and legal now. Need rapid approval on customer support commitments and press response timing.",
} as const;

type ActionButtonsProps = {
  onPrefill: (nextText: string) => void;
  disabled: boolean;
};

export default function ActionButtons({ onPrefill, disabled }: ActionButtonsProps) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Quick Actions</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPrefill(ACTION_TEMPLATES.holdingStatement)}
          disabled={disabled}
          className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Draft Holding Statement
        </button>

        <button
          type="button"
          onClick={() => onPrefill(ACTION_TEMPLATES.dmReporter)}
          disabled={disabled}
          className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          DM Reporter
        </button>

        <button
          type="button"
          onClick={() => onPrefill(ACTION_TEMPLATES.internalMemo)}
          disabled={disabled}
          className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Internal Memo
        </button>

        <button
          type="button"
          onClick={() => onPrefill(ACTION_TEMPLATES.escalate)}
          disabled={disabled}
          className="rounded border border-amber-700/70 bg-amber-950/40 px-3 py-2 text-left text-sm text-amber-100 hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Escalate
        </button>
      </div>
    </section>
  );
}
