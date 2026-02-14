import { useMemo, useState } from "react";

import type { GenerateEpisodeResponse } from "@/lib/schemas";

type EpisodeBeat = GenerateEpisodeResponse["episode"]["beats"][number];
type InternalMessage = EpisodeBeat["internalMessages"][number];

type OpsRoomInternalChatProps = {
  internalMessages: InternalMessage[];
};

function priorityTheme(priority: InternalMessage["priority"]): string {
  switch (priority) {
    case "high":
      return "border-rose-700/50 bg-rose-950/20 text-rose-300";
    case "normal":
      return "border-amber-700/50 bg-amber-950/20 text-amber-300";
    default:
      return "border-zinc-700/40 bg-zinc-800/30 text-zinc-300";
  }
}

function channelTheme(channel: string): string {
  if (channel.includes("incident")) {
    return "bg-rose-900/30 text-rose-200";
  }
  if (channel.includes("support")) {
    return "bg-cyan-900/30 text-cyan-200";
  }
  return "bg-zinc-800/40 text-zinc-300";
}

export function OpsRoomInternalChat({ internalMessages }: OpsRoomInternalChatProps) {
  const [priorityFilter, setPriorityFilter] = useState<InternalMessage["priority"] | "all">("all");
  const filteredMessages = useMemo(
    () =>
      priorityFilter === "all"
        ? internalMessages
        : internalMessages.filter((message) => message.priority === priorityFilter),
    [internalMessages, priorityFilter],
  );

  return (
    <section className="glass-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">Internal Chat</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-emerald-400/80">
            Team Inbound · Read-only
          </p>
        </div>
        <span className="rounded-md border border-zinc-700/50 bg-zinc-800/40 px-2 py-1 text-xs font-bold text-zinc-400">
          {internalMessages.length} messages
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(["all", "high", "normal", "low"] as const).map((priority) => (
          <button
            key={priority}
            type="button"
            onClick={() => setPriorityFilter(priority)}
            className={`rounded-md border px-2 py-1 font-bold uppercase tracking-wide transition ${
              priorityFilter === priority
                ? "glow-border-cyan border-cyan-500/60 bg-cyan-950/30 text-cyan-300"
                : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500/60 hover:text-zinc-300"
            }`}
          >
            {priority}
          </button>
        ))}
      </div>

      <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1 text-sm">
        {filteredMessages.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-700/40 bg-zinc-800/20 p-3 text-zinc-500">
            No messages for this priority filter.
          </li>
        ) : null}

        {filteredMessages.map((message) => (
          <li
            key={`${message.id}-${message.from}`}
            className={`animate-fade-in-up rounded-lg border border-zinc-700/40 bg-zinc-800/30 p-3 ${
              message.priority === "high" ? "border-l-2 border-l-rose-500/60" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
              <span className="font-bold text-zinc-200">{message.from}</span>
              <span className={`rounded px-2 py-0.5 ${channelTheme(message.channel)}`}>{message.channel}</span>
              <span className={`rounded border px-2 py-0.5 ${priorityTheme(message.priority)}`}>{message.priority}</span>
            </div>
            <p className="mt-2 text-zinc-200">{message.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
