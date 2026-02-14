"use client";

import type { GenerateEpisodeResponse } from "@/lib/schemas";

type InternalMessage = GenerateEpisodeResponse["episode"]["beats"][number]["internalMessages"][number];

type InternalChatProps = {
  messages: InternalMessage[];
};

function priorityClass(priority: InternalMessage["priority"]): string {
  switch (priority) {
    case "high":
      return "text-red-300";
    case "normal":
      return "text-amber-300";
    default:
      return "text-zinc-300";
  }
}

export default function InternalChat({ messages }: InternalChatProps) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Internal Chat</h3>
        <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
          {messages.length} msgs
        </span>
      </div>

      <ul className="max-h-80 space-y-2 overflow-y-auto pr-2">
        {messages.length === 0 ? (
          <li className="rounded border border-dashed border-zinc-700 bg-zinc-800/60 p-3 text-sm text-zinc-400">
            Waiting for internal traffic.
          </li>
        ) : null}

        {messages.map((message) => (
          <li key={`${message.id}-${message.from}`} className="rounded border border-zinc-700 bg-zinc-800/80 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              {message.from} · {message.channel} · <span className={priorityClass(message.priority)}>{message.priority}</span>
            </p>
            <p className="mt-1 text-sm leading-5 text-zinc-100">{message.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
