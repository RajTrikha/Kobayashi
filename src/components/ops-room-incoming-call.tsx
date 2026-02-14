import type { RefObject } from "react";

type OpsRoomIncomingCallProps = {
  callPersona: string;
  callTranscript: string;
  callAudioUrl: string | null;
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
  autoPlayBlocked,
  callError,
  isLoadingCallAudio,
  audioRef,
  onPlayAudio,
}: OpsRoomIncomingCallProps) {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Incoming Reporter Call</h2>
      <p className="text-sm text-zinc-300">
        Persona: <span className="font-semibold text-zinc-100">{callPersona || "No active caller"}</span>
      </p>
      <p className="mt-2 rounded border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-100">
        {callTranscript || "Transcript appears when a beat with a reporter call triggers."}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onPlayAudio}
          disabled={!callAudioUrl}
          className="rounded bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          PLAY
        </button>
        <span className="text-xs text-zinc-400">
          {isLoadingCallAudio ? "Loading audio..." : autoPlayBlocked ? "Autoplay blocked. Use PLAY." : ""}
        </span>
      </div>

      <audio ref={audioRef} className="mt-3 w-full" controls src={callAudioUrl ?? undefined} preload="auto" />

      {callError ? <p className="mt-2 text-sm text-red-300">{callError}</p> : null}
    </div>
  );
}
