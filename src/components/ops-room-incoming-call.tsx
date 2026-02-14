import { useState } from "react";

import type { RefObject } from "react";

type CallTurn = {
  id: string;
  speaker: "reporter" | "player";
  text: string;
  tone?: "neutral" | "pressing" | "skeptical" | "closing";
};

type OpsRoomIncomingCallProps = {
  callPersona: string;
  callHistory: CallTurn[];
  selectedReplyTargetId: string | null;
  selectedReplyTargetText: string | null;
  callAudioUrl: string | null;
  isCallRinging: boolean;
  isCallActive: boolean;
  isCallEnded: boolean;
  isReporterResponding: boolean;
  autoPlayBlocked: boolean;
  callError: string | null;
  isLoadingCallAudio: boolean;
  callDraftText: string;
  isSpeechToTextSupported: boolean;
  isListeningToCall: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onCallDraftChange: (nextValue: string) => void;
  onAnswerCall: () => void;
  onSendCallResponse: () => void;
  onToggleCallListening: () => void;
  onSelectReplyTarget: (turnId: string) => void;
  onSelectLatestReplyTarget: () => void;
};

export function OpsRoomIncomingCall({
  callPersona,
  callHistory,
  selectedReplyTargetId,
  selectedReplyTargetText,
  callAudioUrl,
  isCallRinging,
  isCallActive,
  isCallEnded,
  isReporterResponding,
  autoPlayBlocked,
  callError,
  isLoadingCallAudio,
  callDraftText,
  isSpeechToTextSupported,
  isListeningToCall,
  audioRef,
  onCallDraftChange,
  onAnswerCall,
  onSendCallResponse,
  onToggleCallListening,
  onSelectReplyTarget,
  onSelectLatestReplyTarget,
}: OpsRoomIncomingCallProps) {
  const [panelTab, setPanelTab] = useState<"transcript" | "audio">("transcript");
  const hasTranscript = callHistory.length > 0;
  const canSend =
    isCallActive &&
    !isCallEnded &&
    !isReporterResponding &&
    callDraftText.trim().length > 0 &&
    Boolean(selectedReplyTargetId);
  const canUseMic = isCallActive && !isCallEnded && !isReporterResponding && isSpeechToTextSupported;

  return (
    <div className={`glass-panel p-4 transition-all ${isCallRinging ? "animate-border-pulse border-red-500/40" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">Incoming media call</h2>
        <span
          className={`rounded-md px-2 py-1 text-xs font-bold transition ${
            isCallRinging
              ? "animate-pulse border border-red-600/60 bg-red-950/40 text-red-300 glow-border-red"
              : isCallEnded
                ? "border border-zinc-600/60 bg-zinc-900/60 text-zinc-300"
                : isCallActive
                  ? "border border-cyan-700/50 bg-cyan-950/30 text-cyan-300"
                  : callAudioUrl
                ? "border border-cyan-700/50 bg-cyan-950/30 text-cyan-300"
                : "border border-zinc-700/50 bg-zinc-800/40 text-zinc-400"
          }`}
        >
          {isCallRinging ? "Ringing" : isCallEnded ? "Ended" : isCallActive ? "Live" : callAudioUrl ? "Ready" : "Standby"}
        </span>
      </div>

      <div className="rounded-lg border border-zinc-700/40 bg-zinc-800/30 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Caller</p>
        <p className="mt-1 text-sm text-zinc-200">{callPersona || "No active caller"}</p>
      </div>

      <div className="mt-3 inline-flex rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-1 text-xs">
        <button
          type="button"
          onClick={() => setPanelTab("transcript")}
          className={`rounded px-2 py-1 font-bold transition ${
            panelTab === "transcript" ? "glow-border-cyan bg-cyan-700/80 text-cyan-50" : "text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200"
          }`}
        >
          Transcript
        </button>
        <button
          type="button"
          onClick={() => setPanelTab("audio")}
          className={`rounded px-2 py-1 font-bold transition ${
            panelTab === "audio" ? "glow-border-cyan bg-cyan-700/80 text-cyan-50" : "text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200"
          }`}
        >
          Audio
        </button>
      </div>

      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-zinc-500">Reporter transcript</p>
      {panelTab === "transcript" ? (
        <div className="mt-2 flex max-h-72 min-h-52 flex-col gap-2 overflow-y-auto rounded-lg border border-zinc-700/40 bg-zinc-800/30 p-3">
          {!hasTranscript ? (
            <p className="text-sm text-zinc-400">Transcript appears when a beat with a reporter call triggers.</p>
          ) : (
            callHistory.map((turn) => (
              <div key={turn.id} className={`flex ${turn.speaker === "player" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-lg border px-3 py-2 text-sm ${
                    turn.speaker === "player"
                      ? "border-cyan-600/40 bg-cyan-950/40 text-cyan-100"
                      : turn.tone === "skeptical"
                        ? "border-amber-600/40 bg-amber-950/30 text-amber-100"
                        : turn.tone === "closing"
                          ? "border-zinc-600/50 bg-zinc-900/70 text-zinc-100"
                        : "border-rose-700/40 bg-rose-950/30 text-rose-100"
                  } ${
                    turn.speaker === "reporter" && turn.id === selectedReplyTargetId
                      ? "ring-1 ring-cyan-500/60"
                      : ""
                  }`}
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    {turn.speaker === "player" ? "You" : "Reporter"}
                  </p>
                  <p>{turn.text}</p>
                  {turn.speaker === "reporter" && isCallActive && !isCallEnded ? (
                    <button
                      type="button"
                      onClick={() => onSelectReplyTarget(turn.id)}
                      className={`mt-2 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                        turn.id === selectedReplyTargetId
                          ? "border-cyan-500/50 bg-cyan-600/30 text-cyan-100"
                          : "border-zinc-600/60 bg-zinc-900/50 text-zinc-300 hover:border-cyan-700/60 hover:text-cyan-100"
                      }`}
                    >
                      {turn.id === selectedReplyTargetId ? "Selected" : "Reply to this"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onAnswerCall}
          disabled={!callAudioUrl || isCallRinging}
          className="glow-btn-cyan rounded-lg bg-cyan-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          Answer call
        </button>
        <span className="text-xs text-zinc-500">
          {isCallRinging
            ? "Ringing…"
            : isLoadingCallAudio
              ? "Loading audio..."
              : autoPlayBlocked
                ? "Autoplay blocked by your browser. Click \"Answer call\" to play."
                : isReporterResponding
                  ? "Reporter is responding..."
                  : isCallEnded
                    ? "Call ended."
                : ""}
        </span>
      </div>

      {isCallActive ? (
        <div className="mt-3 rounded-lg border border-zinc-700/40 bg-zinc-900/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-zinc-700/50 bg-zinc-950/60 px-2 py-1.5 text-[11px] text-zinc-300">
            <span className="truncate">
              {selectedReplyTargetText
                ? `Replying to: "${selectedReplyTargetText}"`
                : "Select a reporter message to reply."}
            </span>
            <button
              type="button"
              onClick={onSelectLatestReplyTarget}
              className="shrink-0 rounded border border-zinc-600/60 bg-zinc-900/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-200 transition hover:border-cyan-700/60 hover:text-cyan-100"
            >
              Latest
            </button>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={callDraftText}
              onChange={(event) => onCallDraftChange(event.target.value)}
              placeholder={isCallEnded ? "Call has ended" : "Respond to reporter..."}
              className="min-h-20 flex-1 resize-none rounded-md border border-zinc-600/60 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none ring-cyan-500/40 transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              maxLength={220}
              disabled={isCallEnded || isReporterResponding}
            />
            <button
              type="button"
              onClick={onToggleCallListening}
              disabled={!canUseMic}
              className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${
                isListeningToCall
                  ? "bg-rose-700 hover:bg-rose-600"
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              {isListeningToCall ? "Stop mic" : "Use mic"}
            </button>
            <button
              type="button"
              onClick={onSendCallResponse}
              disabled={!canSend}
              className="glow-btn-cyan rounded-md bg-cyan-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              Send
            </button>
          </div>
          {!isSpeechToTextSupported ? (
            <p className="mt-2 text-[11px] text-zinc-500">Speech-to-text unavailable in this browser. Use typed response.</p>
          ) : null}
          <p className="mt-2 text-right text-[11px] text-zinc-500">{220 - callDraftText.length} chars left</p>
        </div>
      ) : null}

      <div className="mt-2 flex h-8 items-end gap-1 rounded-lg border border-zinc-700/40 bg-zinc-950/50 px-2 py-1">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className={`w-1 rounded-sm transition-all ${
              isCallRinging || callAudioUrl || isReporterResponding ? "animate-pulse bg-cyan-400/80" : "bg-zinc-700/50"
            }`}
            style={{
              height: `${20 + ((index * 13) % 65)}%`,
              animationDelay: `${index * 60}ms`,
              animationDuration: "1100ms",
              boxShadow:
                isCallRinging || callAudioUrl || isReporterResponding ? "0 0 4px rgba(6,182,212,0.3)" : "none",
            }}
          />
        ))}
      </div>

      {panelTab === "audio" ? (
        <audio ref={audioRef} className="mt-3 w-full" controls src={callAudioUrl ?? undefined} preload="auto" />
      ) : null}

      {callError ? (
        <p className="animate-fade-in-up mt-3 rounded-lg border border-rose-700/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-300 glow-border-red">{callError}</p>
      ) : null}
    </div>
  );
}
