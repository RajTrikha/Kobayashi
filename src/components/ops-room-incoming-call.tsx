import type { RefObject } from "react";

type OpsRoomIncomingCallProps = {
  callPersona: string;
  callTranscript: string;
  callAudioUrl: string | null;
  isCallRinging: boolean;
  autoPlayBlocked: boolean;
  callError: string | null;
  isLoadingCallAudio: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onPlayAudio: () => void;
};

export function OpsRoomIncomingCall({
  callPersona,
  callTranscript,
  callAudioUrl,
  isCallRinging,
  autoPlayBlocked,
  callError,
  isLoadingCallAudio,
  audioRef,
  onPlayAudio,
}: OpsRoomIncomingCallProps) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">Incoming media call</h2>
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            isCallRinging ? "animate-pulse bg-amber-900/60 text-amber-200" : "bg-zinc-800 text-zinc-300"
          }`}
        >
          {isCallRinging ? "Ringing" : callAudioUrl ? "Connected" : "Standby"}
        </span>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/70 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Caller</p>
        <p className="mt-1 text-sm text-zinc-100">{callPersona || "No active caller"}</p>
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Reporter transcript</p>
      <p className="mt-2 rounded-lg border border-zinc-700 bg-zinc-800/70 p-3 text-sm text-zinc-100">
        {callTranscript || "Transcript appears when a beat with a reporter call triggers."}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onPlayAudio}
          disabled={!callAudioUrl || isCallRinging}
          className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Answer call
        </button>
        <span className="text-xs text-zinc-400">
          {isCallRinging
            ? "Ringing…"
            : isLoadingCallAudio
              ? "Loading audio..."
              : autoPlayBlocked
                ? "Autoplay blocked by your browser. Click “Answer call” to play."
                : ""}
        </span>
      </div>

      <audio ref={audioRef} className="mt-3 w-full" controls src={callAudioUrl ?? undefined} preload="auto" />

      {callError ? (
        <p className="mt-3 rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{callError}</p>
      ) : null}
    </div>
  );
}
