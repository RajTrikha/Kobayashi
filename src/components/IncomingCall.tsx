"use client";

import type { RefObject } from "react";

type IncomingCallProps = {
  persona: string;
  transcript: string;
  audioUrl: string | null;
  isLoadingAudio: boolean;
  autoPlayBlocked: boolean;
  error: string | null;
  onPlay: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
};

export default function IncomingCall({
  persona,
  transcript,
  audioUrl,
  isLoadingAudio,
  autoPlayBlocked,
  error,
  onPlay,
  audioRef,
}: IncomingCallProps) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Incoming Reporter Call</h3>

      <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/80 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Caller</p>
        <p className="mt-1 text-sm text-zinc-100">{persona || "No active caller"}</p>
      </div>

      <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/80 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Transcript</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-zinc-100">
          {transcript || "Transcript will appear when a call beat triggers."}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onPlay}
          disabled={!audioUrl}
          className="rounded border border-zinc-600 bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          PLAY
        </button>
        <p className="text-xs text-zinc-400">
          {isLoadingAudio ? "Loading audio..." : autoPlayBlocked ? "Autoplay blocked. Use PLAY." : ""}
        </p>
      </div>

      <audio ref={audioRef} className="mt-3 w-full" controls preload="auto" src={audioUrl ?? undefined} />

      {error ? (
        <p className="mt-3 rounded border border-red-700/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}
    </section>
  );
}
