import type { GenerateEpisodeResponse } from "@/lib/schemas";

type EpisodeBeat = GenerateEpisodeResponse["episode"]["beats"][number];
type InternalMessage = EpisodeBeat["internalMessages"][number];

type OpsRoomInternalChatProps = {
  internalMessages: InternalMessage[];
};

export function OpsRoomInternalChat({ internalMessages }: OpsRoomInternalChatProps) {
  return (
    <section className="rounded border border-zinc-700 bg-zinc-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Internal Chat</h2>
      <ul className="max-h-80 space-y-2 overflow-y-auto pr-2 text-sm">
        {internalMessages.length === 0 ? <li className="text-zinc-400">No internal chat messages yet.</li> : null}
        {internalMessages.map((message) => (
          <li key={`${message.id}-${message.from}`} className="rounded border border-zinc-700 bg-zinc-800 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              {message.from} · {message.channel} · {message.priority}
            </p>
            <p className="mt-1">{message.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
