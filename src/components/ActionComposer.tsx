"use client";

import type { FormEvent } from "react";

type ActionComposerProps = {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  submitDisabled: boolean;
  isSubmitting: boolean;
  maxChars?: number;
};

export default function ActionComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  submitDisabled,
  isSubmitting,
  maxChars = 220,
}: ActionComposerProps) {
  const charsLeft = maxChars - value.length;

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Action Composer</h3>

      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, maxChars))}
          placeholder="Write your response for media, support, or internal teams..."
          disabled={disabled}
          className="h-28 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-cyan-600/50 placeholder:text-zinc-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">{charsLeft} characters left</span>
          <button
            type="submit"
            disabled={submitDisabled}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Action"}
          </button>
        </div>
      </form>
    </section>
  );
}
