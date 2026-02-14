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
      return "border-rose-700/70 bg-rose-950/35";
    case "concerned":
      return "border-amber-700/70 bg-amber-950/35";
    default:
      return "border-cyan-700/70 bg-cyan-950/20";
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
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Public Feed</h2>
        <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
          {feedItems.length} updates
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {(["all", "critical", "concerned", "neutral"] as const).map((tone) => (
          <button
            key={tone}
            type="button"
            onClick={() => setToneFilter(tone)}
            className={`rounded-md border px-2 py-1 uppercase tracking-wide transition ${
              toneFilter === tone
                ? "border-cyan-500 bg-cyan-950/40 text-cyan-100"
                : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {tone}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSortOrder((current) => (current === "latest" ? "oldest" : "latest"))}
          className="ml-auto rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-300 transition hover:border-zinc-500"
        >
          {sortOrder === "latest" ? "Latest First" : "Oldest First"}
        </button>
      </div>

      <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1 text-sm">
        {visibleItems.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 p-3 text-zinc-400">
            No feed items match the current filter.
          </li>
        ) : null}

        {visibleItems.map((item) => (
          <li
            key={`${item.id}-${item.source}`}
            className={`rounded-lg border p-3 transition ${toneTheme(item.tone)}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-zinc-300">{item.source}</p>
              <span className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase text-zinc-200">{item.tone}</span>
            </div>
            <p className="mt-2 leading-5 text-zinc-100">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
