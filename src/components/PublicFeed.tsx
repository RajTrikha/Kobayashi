"use client";

import type { GenerateEpisodeResponse } from "@/lib/schemas";

type FeedItem = GenerateEpisodeResponse["episode"]["beats"][number]["feedItems"][number];

type PublicFeedProps = {
  items: FeedItem[];
};

function toneBadge(tone: FeedItem["tone"]): string {
  switch (tone) {
    case "critical":
      return "border-red-700/60 bg-red-950/50 text-red-200";
    case "concerned":
      return "border-amber-700/60 bg-amber-950/50 text-amber-200";
    default:
      return "border-zinc-600 bg-zinc-800 text-zinc-200";
  }
}

export default function PublicFeed({ items }: PublicFeedProps) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Public Feed</h3>
        <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400">{items.length} updates</span>
      </div>

      <ul className="max-h-96 space-y-2 overflow-y-auto pr-2">
        {items.length === 0 ? (
          <li className="rounded border border-dashed border-zinc-700 bg-zinc-800/60 p-3 text-sm text-zinc-400">
            Waiting for public signals.
          </li>
        ) : null}

        {items.map((item) => (
          <li key={`${item.id}-${item.source}`} className="rounded border border-zinc-700 bg-zinc-800/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{item.source}</p>
              <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase ${toneBadge(item.tone)}`}>
                {item.tone}
              </span>
            </div>
            <p className="mt-2 text-sm leading-5 text-zinc-100">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
