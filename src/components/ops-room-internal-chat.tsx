import type { GenerateEpisodeResponse } from "@/lib/schemas";

type EpisodeBeat = GenerateEpisodeResponse["episode"]["beats"][number];
type InternalMessage = EpisodeBeat["internalMessages"][number];

type OpsRoomInternalChatProps = {
  internalMessages: InternalMessage[];
};

function priorityTheme(priority: InternalMessage["priority"]): string {
  switch (priority) {
    case "high":
      return "border-rose-700/70 bg-rose-950/30 text-rose-200";
    case "normal":
      return "border-amber-700/70 bg-amber-950/30 text-amber-200";
    default:
      return "border-zinc-700 bg-zinc-800 text-zinc-200";
  }
}

function channelTheme(channel: string): string {
  if (channel.includes("incident")) {
    return "bg-rose-900/40 text-rose-100";
  }
  if (channel.includes("support")) {
    return "bg-cyan-900/40 text-cyan-100";
  }
  return "bg-zinc-800 text-zinc-200";
}

export function OpsRoomInternalChat({ internalMessages }: OpsRoomInternalChatProps) {
  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Internal Chat</h2>
        <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
          {internalMessages.length} messages
        </span>
      </div>

      <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1 text-sm">
        {internalMessages.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-700 bg-zinc-800/50 p-3 text-zinc-400">
            No internal chat messages yet.
          </li>
        ) : null}

        {internalMessages.map((message) => (
          <li key={`${message.id}-${message.from}`} className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-zinc-300">
              <span className="font-semibold text-zinc-100">{message.from}</span>
              <span className={`rounded px-2 py-0.5 ${channelTheme(message.channel)}`}>{message.channel}</span>
              <span className={`rounded border px-2 py-0.5 ${priorityTheme(message.priority)}`}>{message.priority}</span>
            </div>
            <p className="mt-2 text-zinc-100">{message.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
