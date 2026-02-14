"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  afterActionResponseSchema,
  evaluateEpisodeResponseSchema,
  generateEpisodeResponseSchema,
  type AfterActionRequest,
  type EvaluateEpisodeResponse,
  type GenerateEpisodeResponse,
  type RunState,
} from "@/lib/schemas";

type EpisodeBeat = GenerateEpisodeResponse["episode"]["beats"][number];
type FeedItem = EpisodeBeat["feedItems"][number];
type InternalMessage = EpisodeBeat["internalMessages"][number];
type RunLogEntry = AfterActionRequest["runLog"][number];

const START_REQUEST = {
  pack: "pr_meltdown",
  role: "Head of Comms",
  org: "SkyWave Air",
} as const;

function formatClock(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function SimulatorPage() {
  const router = useRouter();
  const [episode, setEpisode] = useState<GenerateEpisodeResponse | null>(null);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [clockRemainingSec, setClockRemainingSec] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>([]);
  const [lastBeatId, setLastBeatId] = useState<string | null>(null);

  const [callTranscript, setCallTranscript] = useState("");
  const [callPersona, setCallPersona] = useState("");
  const [callAudioUrl, setCallAudioUrl] = useState<string | null>(null);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [isLoadingCallAudio, setIsLoadingCallAudio] = useState(false);

  const [actionText, setActionText] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<EvaluateEpisodeResponse | null>(null);
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);

  const startMsRef = useRef<number | null>(null);
  const triggeredBeatIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const runLogRef = useRef<RunLogEntry[]>([]);
  const afterActionStartedRef = useRef(false);

  const startAbortRef = useRef<AbortController | null>(null);
  const evaluateAbortRef = useRef<AbortController | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const afterActionAbortRef = useRef<AbortController | null>(null);

  const revokeAudioUrl = useCallback((nextUrl: string | null = null) => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioUrlRef.current = nextUrl;
  }, []);

  const runEnded = useMemo(() => Boolean(episode) && clockRemainingSec <= 0, [episode, clockRemainingSec]);
  const actionCharsLeft = 220 - actionText.length;

  const appendRunLog = useCallback((entry: RunLogEntry) => {
    setRunLog((previous) => {
      const next = [...previous, entry];
      runLogRef.current = next;
      return next;
    });
  }, []);

  const resetRunView = useCallback(() => {
    setFeedItems([]);
    setInternalMessages([]);
    setLastBeatId(null);
    setElapsedSec(0);
    setActionText("");
    setLastEvaluation(null);
    setPageError(null);
    setRunLog([]);
    setIsFinalizing(false);

    setCallTranscript("");
    setCallPersona("");
    setCallAudioUrl(null);
    setAutoPlayBlocked(false);
    setCallError(null);
    setIsLoadingCallAudio(false);
    revokeAudioUrl();

    triggeredBeatIdsRef.current = new Set();
    runLogRef.current = [];
    afterActionStartedRef.current = false;
  }, [revokeAudioUrl]);

  const fetchCallAudio = useCallback(
    async (beat: EpisodeBeat) => {
      if (!beat.call) {
        return;
      }

      setCallTranscript(beat.call.transcript);
      setCallPersona(beat.call.persona);
      setAutoPlayBlocked(false);
      setCallError(null);
      setIsLoadingCallAudio(true);

      ttsAbortRef.current?.abort();
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: beat.call.ttsText,
            persona: beat.call.persona,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`TTS request failed (${response.status})`);
        }

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          throw new Error("TTS returned empty audio.");
        }

        const nextUrl = URL.createObjectURL(audioBlob);
        revokeAudioUrl(nextUrl);
        setCallAudioUrl(nextUrl);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setCallError(error instanceof Error ? error.message : "Unable to generate call audio.");
      } finally {
        setIsLoadingCallAudio(false);
      }
    },
    [revokeAudioUrl],
  );

  const applyBeat = useCallback(
    (beat: EpisodeBeat) => {
      setLastBeatId(beat.id);
      appendRunLog({
        ts: new Date().toISOString(),
        type: "beat",
        message: `Applied beat ${beat.id}`,
        payload: {
          beatId: beat.id,
          atSec: beat.atSec,
          feedItemCount: beat.feedItems.length,
          internalMessageCount: beat.internalMessages.length,
          hasCall: Boolean(beat.call),
        },
      });

      if (beat.feedItems.length > 0) {
        setFeedItems((previous) => [...previous, ...beat.feedItems]);
      }

      if (beat.internalMessages.length > 0) {
        setInternalMessages((previous) => [...previous, ...beat.internalMessages]);
      }

      if (beat.call) {
        void fetchCallAudio(beat);
      }
    },
    [appendRunLog, fetchCallAudio],
  );

  useEffect(() => {
    if (!callAudioUrl || !audioRef.current) {
      return;
    }

    const audio = audioRef.current;
    audio.currentTime = 0;

    void audio.play().then(
      () => {
        setAutoPlayBlocked(false);
      },
      () => {
        setAutoPlayBlocked(true);
      },
    );
  }, [callAudioUrl]);

  useEffect(() => {
    if (!episode || startMsRef.current === null) {
      return;
    }

    const startingTime = episode.episode.initialState.timeRemainingSec;
    const intervalId = window.setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - startMsRef.current!) / 1000);
      const nextRemaining = Math.max(0, startingTime - nextElapsed);

      setElapsedSec(nextElapsed);
      setClockRemainingSec(nextRemaining);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [episode]);

  useEffect(() => {
    if (!episode) {
      return;
    }

    for (const beat of episode.episode.beats) {
      if (beat.atSec > elapsedSec) {
        continue;
      }
      if (triggeredBeatIdsRef.current.has(beat.id)) {
        continue;
      }

      triggeredBeatIdsRef.current.add(beat.id);
      applyBeat(beat);
    }
  }, [applyBeat, elapsedSec, episode]);

  useEffect(() => {
    setRunState((previous) => {
      if (!previous) {
        return previous;
      }
      if (previous.timeRemainingSec === clockRemainingSec) {
        return previous;
      }

      return {
        ...previous,
        timeRemainingSec: clockRemainingSec,
      };
    });
  }, [clockRemainingSec]);

  useEffect(() => {
    return () => {
      startAbortRef.current?.abort();
      evaluateAbortRef.current?.abort();
      ttsAbortRef.current?.abort();
      afterActionAbortRef.current?.abort();
      revokeAudioUrl();
    };
  }, [revokeAudioUrl]);

  const handleStart = useCallback(async () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    setPageError(null);
    resetRunView();

    startAbortRef.current?.abort();
    const controller = new AbortController();
    startAbortRef.current = controller;

    try {
      const response = await fetch("/api/episode/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(START_REQUEST),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Generate failed (${response.status})`);
      }

      const payload = await response.json();
      const parsed = generateEpisodeResponseSchema.safeParse(payload);

      if (!parsed.success) {
        throw new Error("Generate response did not match expected schema.");
      }

      setEpisode(parsed.data);
      setRunState(parsed.data.runState);
      setClockRemainingSec(parsed.data.episode.initialState.timeRemainingSec);
      startMsRef.current = Date.now();
      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Scenario started",
        payload: {
          runId: parsed.data.runId,
          episodeId: parsed.data.episodeId,
          pack: START_REQUEST.pack,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setPageError(error instanceof Error ? error.message : "Unable to start scenario.");
      setEpisode(null);
      setRunState(null);
    } finally {
      setIsStarting(false);
    }
  }, [appendRunLog, isStarting, resetRunView]);

  const handlePlayAudio = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    void audioRef.current.play().then(
      () => {
        setAutoPlayBlocked(false);
      },
      () => {
        setAutoPlayBlocked(true);
      },
    );
  }, []);

  const handleActionSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!episode || !runState || isSubmitting) {
        return;
      }

      const trimmedAction = actionText.trim();
      if (trimmedAction.length === 0 || trimmedAction.length > 220 || runEnded) {
        return;
      }

      appendRunLog({
        ts: new Date().toISOString(),
        type: "action",
        message: "Action submitted",
        payload: {
          text: trimmedAction,
          lastBeatId: lastBeatId ?? "none",
        },
      });

      setIsSubmitting(true);
      setPageError(null);

      evaluateAbortRef.current?.abort();
      const controller = new AbortController();
      evaluateAbortRef.current = controller;

      try {
        const response = await fetch("/api/episode/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            runId: episode.runId,
            episodeId: episode.episodeId,
            runState: {
              ...runState,
              timeRemainingSec: clockRemainingSec,
            },
            action: trimmedAction,
            context: {
              note: `lastBeatId:${lastBeatId ?? "none"}`,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Evaluate failed (${response.status})`);
        }

        const payload = await response.json();
        const parsed = evaluateEpisodeResponseSchema.safeParse(payload);

        if (!parsed.success) {
          throw new Error("Evaluate response did not match expected schema.");
        }

        setLastEvaluation(parsed.data);
        setRunState({
          ...parsed.data.updatedState,
          timeRemainingSec: clockRemainingSec,
        });
        appendRunLog({
          ts: new Date().toISOString(),
          type: "evaluation",
          message: "Action evaluated",
          payload: {
            scoreDelta: parsed.data.scoreDelta,
            coachingNote: parsed.data.coachingNote,
            updatedState: parsed.data.updatedState,
          },
        });
        setActionText("");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setPageError(error instanceof Error ? error.message : "Unable to evaluate action.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [actionText, appendRunLog, clockRemainingSec, episode, isSubmitting, lastBeatId, runEnded, runState],
  );

  useEffect(() => {
    if (!episode || !runState || !runEnded || isSubmitting) {
      return;
    }
    if (afterActionStartedRef.current) {
      return;
    }

    afterActionStartedRef.current = true;
    setIsFinalizing(true);
    setPageError(null);

    const finalState: RunState = {
      ...runState,
      timeRemainingSec: 0,
    };

    afterActionAbortRef.current?.abort();
    const controller = new AbortController();
    afterActionAbortRef.current = controller;

    void (async () => {
      try {
        const response = await fetch("/api/episode/after_action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            runId: episode.runId,
            runLog: runLogRef.current,
            finalState,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`After-action failed (${response.status})`);
        }

        const payload = await response.json();
        const parsed = afterActionResponseSchema.safeParse(payload);

        if (!parsed.success) {
          throw new Error("After-action response did not match expected schema.");
        }

        localStorage.setItem(`kobayashi:run:${episode.runId}`, JSON.stringify(parsed.data));
        router.push(`/aar?runId=${encodeURIComponent(episode.runId)}`);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        afterActionStartedRef.current = false;
        setIsFinalizing(false);
        setPageError(error instanceof Error ? error.message : "Unable to generate after-action report.");
      }
    })();
  }, [episode, isSubmitting, router, runEnded, runState]);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded border border-zinc-700 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Kobayashi Simulator</h1>
              <p className="text-sm text-zinc-300">PR Meltdown loop (minimal working build)</p>
            </div>
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={isStarting || isFinalizing}
              className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStarting ? "Starting..." : "Start PR Meltdown"}
            </button>
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
            <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
              Clock: <span className="font-semibold">{formatClock(clockRemainingSec)}</span>
            </p>
            <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
              Readiness: <span className="font-semibold">{runState?.readinessScore ?? "--"}</span>
            </p>
            <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
              Sentiment / Trust:{" "}
              <span className="font-semibold">
                {runState ? `${runState.publicSentiment} / ${runState.trustScore}` : "--"}
              </span>
            </p>
            <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
              Last Beat: <span className="font-semibold">{lastBeatId ?? "none"}</span>
            </p>
            <p className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2">
              Run Log Events: <span className="font-semibold">{runLog.length}</span>
            </p>
          </div>

          {runEnded ? (
            <p className="mt-3 rounded border border-yellow-700 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-200">
              {isFinalizing
                ? "Timer expired. Generating After-Action Report..."
                : "Timer expired. Action submission is now disabled."}
            </p>
          ) : null}

          {pageError ? (
            <p className="mt-3 rounded border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-200">
              {pageError}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
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
                onClick={handlePlayAudio}
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
        </section>

        <section className="rounded border border-zinc-700 bg-zinc-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Action Composer</h2>
          <form onSubmit={handleActionSubmit} className="space-y-3">
            <textarea
              value={actionText}
              onChange={(event) => setActionText(event.target.value.slice(0, 220))}
              placeholder="Write your next response..."
              className="h-28 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none ring-red-500/60 focus:ring-2"
              disabled={!episode || isSubmitting || isFinalizing || runEnded}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-400">{actionCharsLeft} characters left</p>
              <button
                type="submit"
                disabled={!episode || isSubmitting || isFinalizing || actionText.trim().length === 0 || runEnded}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Action"}
              </button>
            </div>
          </form>

          {lastEvaluation ? (
            <div className="mt-4 rounded border border-zinc-700 bg-zinc-800 p-3 text-sm">
              <p>
                <span className="font-semibold">Score Delta:</span> {lastEvaluation.scoreDelta}
              </p>
              <p className="mt-1">
                <span className="font-semibold">State Delta:</span> sentiment {lastEvaluation.stateDelta.publicSentiment}, trust{" "}
                {lastEvaluation.stateDelta.trustScore}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Coach:</span> {lastEvaluation.coachingNote}
              </p>
              {lastEvaluation.suggestedNextAction ? (
                <p className="mt-1">
                  <span className="font-semibold">Suggested Next:</span> {lastEvaluation.suggestedNextAction}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

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
      </div>
    </main>
  );
}
