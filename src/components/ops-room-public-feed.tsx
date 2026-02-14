import type { GenerateEpisodeResponse } from "@/lib/schemas";

type EpisodeBeat = GenerateEpisodeResponse["episode"]["beats"][number];
type FeedItem = EpisodeBeat["feedItems"][number];

type OpsRoomPublicFeedProps = {
  feedItems: FeedItem[];
};

export function OpsRoomPublicFeed({ feedItems }: OpsRoomPublicFeedProps) {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Public Feed</h2>
      <ul className="max-h-80 space-y-2 overflow-y-auto pr-2 text-sm">
        {feedItems.length === 0 ? <li className="text-zinc-400">No feed events yet.</li> : null}
        {feedItems.map((item) => (
          <li key={`${item.id}-${item.source}`} className="rounded border border-zinc-700 bg-zinc-800 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{item.source}</p>
            <p className="mt-1">{item.text}</p>
            <p className="mt-1 text-xs text-zinc-400">Tone: {item.tone}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
