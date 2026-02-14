import { useMemo, useState } from "react";

import type { GenerateEpisodeResponse } from "@/lib/schemas";

type EpisodeBeat = GenerateEpisodeResponse["episode"]["beats"][number];
type FeedItem = EpisodeBeat["feedItems"][number];

type OpsRoomPublicFeedProps = {
  feedItems: FeedItem[];
};

function toneTheme(tone: FeedItem["tone"]): string {
  switch (tone) {
    case "critical":
      return "border-l-2 border-l-rose-500/70 border-rose-700/40 bg-rose-950/20";
    case "concerned":
      return "border-l-2 border-l-amber-500/70 border-amber-700/40 bg-amber-950/20";
    default:
      return "border-l-2 border-l-cyan-500/50 border-cyan-700/30 bg-cyan-950/10";
  }
}

export function OpsRoomPublicFeed({ feedItems }: OpsRoomPublicFeedProps) {
  const [toneFilter, setToneFilter] = useState<FeedItem["tone"] | "all">("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  const visibleItems = useMemo(() => {
    const filtered = toneFilter === "all" ? [...feedItems] : feedItems.filter((item) => item.tone === toneFilter);
    if (sortOrder === "latest") {
      return filtered.reverse();
    }
    return filtered;
  }, [feedItems, sortOrder, toneFilter]);

  return (
    <div className="glass-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">Public Feed</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-cyan-400/80">
            External Narrative · Read-only
          </p>
        </div>
        <span className="rounded-md border border-zinc-700/50 bg-zinc-800/40 px-2 py-1 text-xs font-bold text-zinc-400">
          {feedItems.length} updates
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {(["all", "critical", "concerned", "neutral"] as const).map((tone) => (
          <button
            key={tone}
            type="button"
            onClick={() => setToneFilter(tone)}
            className={`rounded-md border px-2 py-1 font-bold uppercase tracking-wide transition ${
              toneFilter === tone
                ? "glow-border-cyan border-cyan-500/60 bg-cyan-950/30 text-cyan-300"
                : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500/60 hover:text-zinc-300"
            }`}
          >
            {tone}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSortOrder((current) => (current === "latest" ? "oldest" : "latest"))}
          className="ml-auto rounded-md border border-zinc-700/50 bg-zinc-800/40 px-2 py-1 text-zinc-400 transition hover:border-zinc-500/60 hover:text-zinc-300"
        >
          {sortOrder === "latest" ? "Latest First" : "Oldest First"}
        </button>
      </div>

      <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1 text-sm">
        {visibleItems.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-700/40 bg-zinc-800/20 p-3 text-zinc-500">
            No feed items match the current filter.
          </li>
        ) : null}

        {visibleItems.map((item) => (
          <li
            key={`${item.id}-${item.source}`}
            className={`animate-fade-in-up rounded-lg border p-3 transition ${toneTheme(item.tone)}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{item.source}</p>
              <span className="rounded px-2 py-0.5 text-[11px] font-bold uppercase text-zinc-300">{item.tone}</span>
            </div>
            <p className="mt-2 leading-5 text-zinc-200">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
