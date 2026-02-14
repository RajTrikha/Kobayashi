"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  OpsRoomActionComposer,
  OpsRoomControlPanel,
  OpsRoomIncomingCall,
  OpsRoomInternalChat,
  OpsRoomPublicFeed,
} from "@/components";
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
const IS_DEV_MODE = process.env.NODE_ENV !== "production";

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
  const [isCallRinging, setIsCallRinging] = useState(false);
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
  const ringingTimeoutRef = useRef<number | null>(null);
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
  const appliedBeatCount = useMemo(
    () => runLog.reduce((count, entry) => (entry.type === "beat" ? count + 1 : count), 0),
    [runLog],
  );
  const totalBeatCount = episode?.episode.beats.length ?? 0;
  const hudMode = lastEvaluation?.mode ?? episode?.mode ?? null;
  const lastCoachingNote = lastEvaluation?.coachingNote ?? null;

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
    setIsCallRinging(false);
    setAutoPlayBlocked(false);
    setCallError(null);
    setIsLoadingCallAudio(false);
    revokeAudioUrl();
    if (ringingTimeoutRef.current) {
      window.clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

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
      setCallAudioUrl(null);
      setIsCallRinging(true);
      setAutoPlayBlocked(false);
      setCallError(null);
      setIsLoadingCallAudio(true);
      revokeAudioUrl();

      ttsAbortRef.current?.abort();
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      const ringDelay = new Promise<void>((resolve) => {
        ringingTimeoutRef.current = window.setTimeout(() => {
          ringingTimeoutRef.current = null;
          resolve();
        }, 1500);
      });

      try {
        const audioBlobPromise = fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: beat.call.ttsText,
            persona: beat.call.persona,
          }),
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`TTS request failed (${response.status})`);
          }
          return response.blob();
        });

        const [audioBlob] = await Promise.all([audioBlobPromise, ringDelay]);
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
        if (ringingTimeoutRef.current) {
          window.clearTimeout(ringingTimeoutRef.current);
          ringingTimeoutRef.current = null;
        }
        setIsCallRinging(false);
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
      if (ringingTimeoutRef.current) {
        window.clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }
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

  const finalizeRun = useCallback(async () => {
    if (!episode || !runState) {
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
        afterActionStartedRef.current = false;
        setIsFinalizing(false);
        return;
      }

      afterActionStartedRef.current = false;
      setIsFinalizing(false);
      setPageError(error instanceof Error ? error.message : "Unable to generate after-action report.");
    }
  }, [episode, router, runState]);

  useEffect(() => {
    if (!runEnded || isSubmitting) {
      return;
    }

    void finalizeRun();
  }, [finalizeRun, isSubmitting, runEnded]);

  const handleEndNow = useCallback(() => {
    void finalizeRun();
  }, [finalizeRun]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,rgba(14,116,144,0.16),transparent_40%),radial-gradient(circle_at_95%_5%,rgba(190,24,93,0.12),transparent_35%),#09090b] px-4 py-6 text-zinc-100 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <OpsRoomControlPanel
          clock={formatClock(clockRemainingSec)}
          runState={runState}
          lastBeatId={lastBeatId}
          runLogCount={runLog.length}
          mode={hudMode}
          scenarioName="PR Meltdown"
          appliedBeatCount={appliedBeatCount}
          totalBeatCount={totalBeatCount}
          lastCoachingNote={lastCoachingNote}
          runEnded={runEnded}
          isStarting={isStarting}
          isFinalizing={isFinalizing}
          pageError={pageError}
          isDevMode={IS_DEV_MODE}
          canEndNow={Boolean(episode && runState)}
          onStart={() => void handleStart()}
          onEndNow={handleEndNow}
        />

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <OpsRoomPublicFeed feedItems={feedItems} />
          </div>

          <div className="xl:col-span-4">
            <OpsRoomActionComposer
              actionText={actionText}
              actionCharsLeft={actionCharsLeft}
              hasEpisode={Boolean(episode)}
              isSubmitting={isSubmitting}
              isFinalizing={isFinalizing}
              runEnded={runEnded}
              lastEvaluation={lastEvaluation}
              onActionTextChange={setActionText}
              onSubmit={handleActionSubmit}
            />
          </div>

          <div className="xl:col-span-4">
            <OpsRoomIncomingCall
              callPersona={callPersona}
              callTranscript={callTranscript}
              callAudioUrl={callAudioUrl}
              isCallRinging={isCallRinging}
              autoPlayBlocked={autoPlayBlocked}
              callError={callError}
              isLoadingCallAudio={isLoadingCallAudio}
              audioRef={audioRef}
              onPlayAudio={handlePlayAudio}
            />
          </div>
        </section>

        <OpsRoomInternalChat internalMessages={internalMessages} />
      </div>
    </main>
  );
}
