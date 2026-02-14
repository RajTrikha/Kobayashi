"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  OpsRoomActionComposer,
  OpsRoomActivityLog,
  OpsRoomControlPanel,
  OpsRoomIncomingCall,
  OpsRoomInternalChat,
  OpsRoomPublicFeed,
} from "@/components";
import {
  afterActionResponseSchema,
  evaluateEpisodeResponseSchema,
  generateEpisodeResponseSchema,
  reporterRespondResponseSchema,
  type AfterActionRequest,
  type EvaluateEpisodeResponse,
  type GenerateEpisodeResponse,
  type ReporterRespondResponse,
  type RunState,
} from "@/lib/schemas";

type EpisodeBeat = GenerateEpisodeResponse["episode"]["beats"][number];
type FeedItem = EpisodeBeat["feedItems"][number];
type InternalMessage = EpisodeBeat["internalMessages"][number];
type RunLogEntry = AfterActionRequest["runLog"][number];
type CallHistoryTurn = {
  id: string;
  speaker: "reporter" | "player";
  text: string;
  tone?: ReporterRespondResponse["tone"];
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const START_REQUEST = {
  pack: "pr_meltdown",
  role: "Head of Comms",
  org: "SkyWave Air",
} as const;
const IS_DEV_MODE = process.env.NODE_ENV !== "production";
const STANDARD_TOTAL_TIME_SEC = 8 * 60;
const JUDGE_DEMO_TOTAL_TIME_SEC = 90;
const JUDGE_DEMO_AUTO_ACTION_STEPS = [
  {
    id: "demo_good_01",
    atSec: 18,
    label: "Strong response",
    action:
      "We understand the disruption and are actively assisting affected passengers now. A dedicated support hotline is live and we will share verified updates every 30 minutes.",
  },
  {
    id: "demo_bad_01",
    atSec: 52,
    label: "Weak response",
    action:
      "No comment at this time. We cannot discuss details and have nothing further to add right now.",
  },
] as const;

type RunProfile = "standard" | "judge_demo";

function formatClock(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

  const [callPersona, setCallPersona] = useState("");
  const [callHistory, setCallHistory] = useState<CallHistoryTurn[]>([]);
  const [selectedReplyTargetId, setSelectedReplyTargetId] = useState<string | null>(null);
  const [callDraftText, setCallDraftText] = useState("");
  const [callAudioUrl, setCallAudioUrl] = useState<string | null>(null);
  const [isCallRinging, setIsCallRinging] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [isReporterResponding, setIsReporterResponding] = useState(false);
  const [isSpeechToTextSupported, setIsSpeechToTextSupported] = useState(false);
  const [isListeningToCall, setIsListeningToCall] = useState(false);
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
  const [viewMode, setViewMode] = useState<"board" | "focus_feed" | "focus_actions">("board");
  const [runProfile, setRunProfile] = useState<RunProfile>("standard");

  const startMsRef = useRef<number | null>(null);
  const triggeredBeatIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ringingTimeoutRef = useRef<number | null>(null);
  const runLogRef = useRef<RunLogEntry[]>([]);
  const callHistoryRef = useRef<CallHistoryTurn[]>([]);
  const triggeredAutoActionIdsRef = useRef<Set<string>>(new Set());
  const afterActionStartedRef = useRef(false);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startAbortRef = useRef<AbortController | null>(null);
  const evaluateAbortRef = useRef<AbortController | null>(null);
  const reporterAbortRef = useRef<AbortController | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const afterActionAbortRef = useRef<AbortController | null>(null);

  const revokeAudioUrl = useCallback((nextUrl: string | null = null) => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioUrlRef.current = nextUrl;
  }, []);

  const runEnded = useMemo(() => Boolean(episode) && clockRemainingSec <= 0, [episode, clockRemainingSec]);
  const isJudgeDemo = runProfile === "judge_demo";
  const actionCharsLeft = 220 - actionText.length;
  const scheduledBeats = useMemo(() => {
    if (!episode) {
      return [] as EpisodeBeat[];
    }

    if (!isJudgeDemo) {
      return [...episode.episode.beats].sort((a, b) => a.atSec - b.atSec);
    }

    const sourceTotal = Math.max(1, episode.episode.initialState.timeRemainingSec);
    const sortedBeats = [...episode.episode.beats].sort((a, b) => a.atSec - b.atSec);
    const scaled = sortedBeats.map((beat) => ({
      ...beat,
      atSec: Math.round((beat.atSec / sourceTotal) * JUDGE_DEMO_TOTAL_TIME_SEC),
    }));

    let previousAt = 0;
    return scaled.map((beat, index) => {
      const minAt = index === 0 ? 6 : previousAt + 10;
      const maxAt = Math.max(minAt, JUDGE_DEMO_TOTAL_TIME_SEC - (scaled.length - index) * 6);
      const stabilizedAt = clampValue(beat.atSec, minAt, maxAt);
      previousAt = stabilizedAt;
      return {
        ...beat,
        atSec: stabilizedAt,
      };
    });
  }, [episode, isJudgeDemo]);
  const appliedBeatCount = useMemo(
    () => runLog.reduce((count, entry) => (entry.type === "beat" ? count + 1 : count), 0),
    [runLog],
  );
  const totalBeatCount = scheduledBeats.length;
  const hudMode = lastEvaluation?.mode ?? episode?.mode ?? null;
  const lastCoachingNote = lastEvaluation?.coachingNote ?? null;
  const totalScenarioTimeSec = useMemo(() => {
    if (!episode) {
      return runProfile === "judge_demo" ? JUDGE_DEMO_TOTAL_TIME_SEC : STANDARD_TOTAL_TIME_SEC;
    }
    return runProfile === "judge_demo"
      ? JUDGE_DEMO_TOTAL_TIME_SEC
      : episode.episode.initialState.timeRemainingSec;
  }, [episode, runProfile]);
  const selectedReplyTargetText = useMemo(() => {
    const target = selectedReplyTargetId
      ? callHistory.find((turn) => turn.id === selectedReplyTargetId && turn.speaker === "reporter")
      : null;
    if (!target) {
      return null;
    }
    return target.text.length > 120 ? `${target.text.slice(0, 117)}...` : target.text;
  }, [callHistory, selectedReplyTargetId]);

  const appendRunLog = useCallback((entry: RunLogEntry) => {
    setRunLog((previous) => {
      const next = [...previous, entry];
      runLogRef.current = next;
      return next;
    });
  }, []);

  const replaceCallHistory = useCallback((nextHistory: CallHistoryTurn[]) => {
    callHistoryRef.current = nextHistory;
    setCallHistory(nextHistory);
  }, []);

  const appendCallTurn = useCallback((turn: CallHistoryTurn) => {
    setCallHistory((previous) => {
      const next = [...previous, turn];
      callHistoryRef.current = next;
      return next;
    });
  }, []);

  const getReporterTurnById = useCallback((turnId: string | null): CallHistoryTurn | null => {
    if (!turnId) {
      return null;
    }
    const found = callHistoryRef.current.find(
      (turn) => turn.id === turnId && turn.speaker === "reporter",
    );
    return found ?? null;
  }, []);

  const getLatestReporterTurn = useCallback((): CallHistoryTurn | null => {
    for (let index = callHistoryRef.current.length - 1; index >= 0; index -= 1) {
      const turn = callHistoryRef.current[index];
      if (turn?.speaker === "reporter") {
        return turn;
      }
    }
    return null;
  }, []);

  const stopCallListening = useCallback(() => {
    const recognition = speechRecognitionRef.current;
    if (!recognition) {
      return;
    }
    try {
      recognition.stop();
    } catch {
      // no-op
    }
    setIsListeningToCall(false);
  }, []);

  const resetRunView = useCallback(() => {
    stopCallListening();
    reporterAbortRef.current?.abort();
    setFeedItems([]);
    setInternalMessages([]);
    setLastBeatId(null);
    setElapsedSec(0);
    setActionText("");
    setLastEvaluation(null);
    setPageError(null);
    setRunLog([]);
    setIsFinalizing(false);

    setCallPersona("");
    replaceCallHistory([]);
    setSelectedReplyTargetId(null);
    setCallDraftText("");
    setCallAudioUrl(null);
    setIsCallRinging(false);
    setIsCallActive(false);
    setIsCallEnded(false);
    setIsReporterResponding(false);
    setIsListeningToCall(false);
    setAutoPlayBlocked(false);
    setCallError(null);
    setIsLoadingCallAudio(false);
    revokeAudioUrl();
    if (ringingTimeoutRef.current) {
      window.clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    triggeredBeatIdsRef.current = new Set();
    triggeredAutoActionIdsRef.current = new Set();
    runLogRef.current = [];
    callHistoryRef.current = [];
    afterActionStartedRef.current = false;
  }, [replaceCallHistory, revokeAudioUrl, stopCallListening]);

  const requestCallAudio = useCallback(
    async (input: { text: string; persona: string; withRinging?: boolean }) => {
      setCallAudioUrl(null);
      setAutoPlayBlocked(false);
      setCallError(null);
      setIsLoadingCallAudio(true);
      revokeAudioUrl();

      if (input.withRinging) {
        setIsCallRinging(true);
      }

      ttsAbortRef.current?.abort();
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      const ringDelay = input.withRinging
        ? new Promise<void>((resolve) => {
            ringingTimeoutRef.current = window.setTimeout(() => {
              ringingTimeoutRef.current = null;
              resolve();
            }, 1500);
          })
        : Promise.resolve();

      try {
        const audioBlobPromise = fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: input.text,
            persona: input.persona,
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

  const fetchCallAudio = useCallback(
    async (beat: EpisodeBeat) => {
      if (!beat.call) {
        return;
      }

      stopCallListening();
      reporterAbortRef.current?.abort();
      setCallPersona(beat.call.persona);
      setCallDraftText("");
      setIsCallActive(false);
      setIsCallEnded(false);
      setIsReporterResponding(false);
      const openingReporterTurn: CallHistoryTurn = {
        id: `${beat.id}_reporter_opening`,
        speaker: "reporter",
        text: beat.call.transcript,
        tone: "pressing",
      };
      replaceCallHistory([
        {
          ...openingReporterTurn,
        },
      ]);
      setSelectedReplyTargetId(openingReporterTurn.id);
      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Incoming media call queued",
        payload: {
          beatId: beat.id,
          persona: beat.call.persona,
        },
      });

      await requestCallAudio({
        text: beat.call.ttsText,
        persona: beat.call.persona,
        withRinging: true,
      });
    },
    [appendRunLog, replaceCallHistory, requestCallAudio, stopCallListening],
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
    if (typeof window === "undefined") {
      return;
    }

    const browserWindow = window as WindowWithSpeechRecognition;
    const RecognitionCtor = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setIsSpeechToTextSupported(false);
      speechRecognitionRef.current = null;
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) {
          continue;
        }
        const transcript = result[0]?.transcript?.trim();
        if (transcript) {
          finalTranscript += `${transcript} `;
        }
      }

      const nextChunk = finalTranscript.trim();
      if (!nextChunk) {
        return;
      }

      setCallDraftText((previous) => {
        const spacer = previous.trim().length > 0 ? " " : "";
        return `${previous}${spacer}${nextChunk}`.slice(0, 220);
      });
    };
    recognition.onerror = (event) => {
      const reason = event.error ?? "unknown";
      setCallError(
        reason === "not-allowed"
          ? "Microphone access blocked. Allow mic permission and try again."
          : `Speech-to-text error: ${reason}`,
      );
      setIsListeningToCall(false);
      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Speech-to-text error",
        payload: {
          reason,
        },
      });
    };
    recognition.onend = () => {
      setIsListeningToCall(false);
    };

    speechRecognitionRef.current = recognition;
    setIsSpeechToTextSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // no-op
      }
      speechRecognitionRef.current = null;
    };
  }, [appendRunLog]);

  useEffect(() => {
    if (!callAudioUrl || !audioRef.current || !isCallActive) {
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
  }, [callAudioUrl, isCallActive]);

  useEffect(() => {
    if (isListeningToCall && (!isCallActive || isCallEnded || runEnded)) {
      stopCallListening();
    }
  }, [isCallActive, isCallEnded, isListeningToCall, runEnded, stopCallListening]);

  useEffect(() => {
    if (!episode || startMsRef.current === null) {
      return;
    }

    const startingTime = totalScenarioTimeSec;
    const intervalId = window.setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - startMsRef.current!) / 1000);
      const nextRemaining = Math.max(0, startingTime - nextElapsed);

      setElapsedSec(nextElapsed);
      setClockRemainingSec(nextRemaining);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [episode, totalScenarioTimeSec]);

  useEffect(() => {
    if (!episode) {
      return;
    }

    for (const beat of scheduledBeats) {
      if (beat.atSec > elapsedSec) {
        continue;
      }
      if (triggeredBeatIdsRef.current.has(beat.id)) {
        continue;
      }

      triggeredBeatIdsRef.current.add(beat.id);
      applyBeat(beat);
    }
  }, [applyBeat, elapsedSec, episode, scheduledBeats]);

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
      stopCallListening();
      startAbortRef.current?.abort();
      evaluateAbortRef.current?.abort();
      reporterAbortRef.current?.abort();
      ttsAbortRef.current?.abort();
      afterActionAbortRef.current?.abort();
      if (ringingTimeoutRef.current) {
        window.clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }
      revokeAudioUrl();
    };
  }, [revokeAudioUrl, stopCallListening]);

  const handleStart = useCallback(async (profile: RunProfile) => {
    if (isStarting) {
      return;
    }

    setRunProfile(profile);
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
      setRunState({
        ...parsed.data.runState,
        timeRemainingSec:
          profile === "judge_demo"
            ? JUDGE_DEMO_TOTAL_TIME_SEC
            : parsed.data.episode.initialState.timeRemainingSec,
      });
      setClockRemainingSec(
        profile === "judge_demo"
          ? JUDGE_DEMO_TOTAL_TIME_SEC
          : parsed.data.episode.initialState.timeRemainingSec,
      );
      startMsRef.current = Date.now();
      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Scenario started",
        payload: {
          runId: parsed.data.runId,
          episodeId: parsed.data.episodeId,
          pack: START_REQUEST.pack,
          runProfile: profile,
          totalTimeSec:
            profile === "judge_demo"
              ? JUDGE_DEMO_TOTAL_TIME_SEC
              : parsed.data.episode.initialState.timeRemainingSec,
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

  const handleAnswerCall = useCallback(() => {
    if (!callAudioUrl || !audioRef.current) {
      return;
    }

    if (!isCallActive) {
      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Media call answered",
        payload: {
          lastBeatId: lastBeatId ?? "none",
          persona: callPersona || "unknown",
        },
      });
    }

    setIsCallActive(true);
    setIsCallEnded(false);
    audioRef.current.currentTime = 0;
    void audioRef.current.play().then(
      () => {
        setAutoPlayBlocked(false);
      },
      () => {
        setAutoPlayBlocked(true);
      },
    );
  }, [appendRunLog, callAudioUrl, callPersona, isCallActive, lastBeatId]);

  const handleToggleCallListening = useCallback(() => {
    if (!isCallActive || isCallEnded || isReporterResponding) {
      return;
    }

    const recognition = speechRecognitionRef.current;
    if (!recognition || !isSpeechToTextSupported) {
      setCallError("Speech-to-text is unavailable in this browser.");
      return;
    }

    if (isListeningToCall) {
      stopCallListening();
      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Speech-to-text stopped",
      });
      return;
    }

    try {
      setCallError(null);
      recognition.start();
      setIsListeningToCall(true);
      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Speech-to-text started",
      });
    } catch (error) {
      setIsListeningToCall(false);
      setCallError(error instanceof Error ? error.message : "Unable to start speech-to-text.");
    }
  }, [
    appendRunLog,
    isCallActive,
    isCallEnded,
    isListeningToCall,
    isReporterResponding,
    isSpeechToTextSupported,
    stopCallListening,
  ]);

  const handleSelectReplyTarget = useCallback((turnId: string) => {
    const target = getReporterTurnById(turnId);
    if (!target) {
      return;
    }
    setSelectedReplyTargetId(target.id);
  }, [getReporterTurnById]);

  const handleSelectLatestReplyTarget = useCallback(() => {
    const latest = getLatestReporterTurn();
    if (!latest) {
      return;
    }
    setSelectedReplyTargetId(latest.id);
  }, [getLatestReporterTurn]);

  const handleCallResponse = useCallback(async () => {
    if (!episode || !callPersona || !isCallActive || isCallEnded || isReporterResponding) {
      return;
    }

    stopCallListening();
    const replyTargetTurn = getReporterTurnById(selectedReplyTargetId) ?? getLatestReporterTurn();
    if (!replyTargetTurn) {
      setCallError("Select a reporter message to reply.");
      return;
    }

    const trimmed = callDraftText.trim();
    if (!trimmed) {
      return;
    }

    const userTurn: CallHistoryTurn = {
      id: `call_player_${Date.now()}`,
      speaker: "player",
      text: trimmed,
    };
    const historyWithUser = [...callHistoryRef.current, userTurn];
    replaceCallHistory(historyWithUser);
    setSelectedReplyTargetId(null);
    setCallDraftText("");
    setIsReporterResponding(true);
    setCallError(null);

    appendRunLog({
      ts: new Date().toISOString(),
      type: "action",
      message: "Reporter call response submitted",
      payload: {
        text: trimmed,
        lastBeatId: lastBeatId ?? "none",
        replyToTurnId: replyTargetTurn.id,
        replyToText: replyTargetTurn.text,
      },
    });

    reporterAbortRef.current?.abort();
    const controller = new AbortController();
    reporterAbortRef.current = controller;

    try {
      const response = await fetch("/api/reporter/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runId: episode.runId,
          persona: callPersona,
          userResponse: trimmed,
          conversationHistory: historyWithUser.map((turn) => ({
            speaker: turn.speaker,
            text: turn.text,
          })),
          scenarioContext: {
            episodeId: episode.episodeId,
            lastBeatId: lastBeatId ?? undefined,
            org: episode.episode.org,
            role: episode.episode.role,
            objective: episode.episode.objective,
            replyToTurnId: replyTargetTurn.id,
            replyToText: replyTargetTurn.text,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Reporter response failed (${response.status})`);
      }

      const payload = await response.json();
      const parsed = reporterRespondResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Reporter response did not match expected schema.");
      }

      const reporterTurn: CallHistoryTurn = {
        id: `call_reporter_${Date.now()}`,
        speaker: "reporter",
        text: parsed.data.reporterReply,
        tone: parsed.data.tone,
      };
      appendCallTurn(reporterTurn);
      setSelectedReplyTargetId(reporterTurn.id);

      appendRunLog({
        ts: new Date().toISOString(),
        type: "system",
        message: "Reporter follow-up received",
        payload: {
          tone: parsed.data.tone,
          shouldContinue: parsed.data.shouldContinue,
          mode: parsed.data.mode,
        },
      });

      await requestCallAudio({
        text: parsed.data.ttsText,
        persona: callPersona,
      });

      if (!parsed.data.shouldContinue) {
        setIsCallEnded(true);
        appendRunLog({
          ts: new Date().toISOString(),
          type: "system",
          message: "Media call ended",
          payload: {
            lastBeatId: lastBeatId ?? "none",
          },
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setCallError(error instanceof Error ? error.message : "Unable to continue reporter call.");
    } finally {
      setIsReporterResponding(false);
    }
  }, [
    appendCallTurn,
    appendRunLog,
    callDraftText,
    callPersona,
    episode,
    getLatestReporterTurn,
    getReporterTurnById,
    isCallActive,
    isCallEnded,
    isReporterResponding,
    lastBeatId,
    replaceCallHistory,
    requestCallAudio,
    selectedReplyTargetId,
    stopCallListening,
  ]);

  const submitActionForEvaluation = useCallback(
    async (input: { action: string; source: "manual" | "autopilot"; label?: string }) => {
      if (!episode || !runState || isSubmitting || runEnded) {
        return false;
      }

      const trimmedAction = input.action.trim();
      if (trimmedAction.length === 0 || trimmedAction.length > 220) {
        return false;
      }

      appendRunLog({
        ts: new Date().toISOString(),
        type: "action",
        message: input.source === "autopilot" ? "Autopilot action submitted" : "Action submitted",
        payload: {
          text: trimmedAction,
          source: input.source,
          label: input.label ?? null,
          lastBeatId: lastBeatId ?? "none",
        },
      });

      setIsSubmitting(true);
      setPageError(null);
      if (input.source === "autopilot") {
        setActionText(trimmedAction);
      }

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
              note: input.source === "autopilot" ? `autopilot:${input.label ?? "step"}|lastBeatId:${lastBeatId ?? "none"}` : `lastBeatId:${lastBeatId ?? "none"}`,
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
          message:
            input.source === "autopilot"
              ? `Autopilot evaluation: ${input.label ?? "step"}`
              : "Action evaluated",
          payload: {
            source: input.source,
            scoreDelta: parsed.data.scoreDelta,
            coachingNote: parsed.data.coachingNote,
            updatedState: parsed.data.updatedState,
          },
        });
        if (input.source === "manual") {
          setActionText("");
        }
        return true;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return false;
        }
        setPageError(error instanceof Error ? error.message : "Unable to evaluate action.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [appendRunLog, clockRemainingSec, episode, isSubmitting, lastBeatId, runEnded, runState],
  );

  const handleActionSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await submitActionForEvaluation({ action: actionText, source: "manual" });
    },
    [actionText, submitActionForEvaluation],
  );

  useEffect(() => {
    if (!isJudgeDemo || !episode || !runState || runEnded || isFinalizing || isSubmitting) {
      return;
    }

    for (const step of JUDGE_DEMO_AUTO_ACTION_STEPS) {
      if (step.atSec > elapsedSec) {
        continue;
      }
      if (triggeredAutoActionIdsRef.current.has(step.id)) {
        continue;
      }

      triggeredAutoActionIdsRef.current.add(step.id);
      void submitActionForEvaluation({
        action: step.action,
        source: "autopilot",
        label: step.label,
      });
      break;
    }
  }, [
    elapsedSec,
    episode,
    isFinalizing,
    isJudgeDemo,
    isSubmitting,
    runEnded,
    runState,
    submitActionForEvaluation,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }
      if (event.key !== "Enter") {
        return;
      }
      if (!episode || !runState || isSubmitting || isFinalizing || runEnded) {
        return;
      }
      if (actionText.trim().length === 0) {
        return;
      }

      event.preventDefault();
      const form = document.getElementById("action-composer-form") as HTMLFormElement | null;
      form?.requestSubmit();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actionText, episode, isFinalizing, isSubmitting, runEnded, runState]);

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

      localStorage.setItem(
        `kobayashi:run:${episode.runId}`,
        JSON.stringify({
          report: parsed.data,
          runLog: runLogRef.current,
          finalState,
          runProfile,
          storedAt: new Date().toISOString(),
        }),
      );
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
  }, [episode, router, runProfile, runState]);

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
    <main className="relative min-h-screen px-4 py-6 text-zinc-100 sm:px-6 sm:py-8">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, rgba(6,182,212,0.12), transparent 40%), radial-gradient(circle at 95% 5%, rgba(220,38,38,0.1), transparent 35%), radial-gradient(circle at 50% 100%, rgba(6,182,212,0.04), transparent 50%)",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5">
        <OpsRoomControlPanel
          clock={formatClock(clockRemainingSec)}
          timeRemainingSec={clockRemainingSec}
          totalTimeSec={totalScenarioTimeSec}
          runState={runState}
          initialRunState={episode?.runState ?? null}
          hasEpisode={Boolean(episode)}
          lastBeatId={lastBeatId}
          runLogCount={runLog.length}
          mode={hudMode}
          scenarioName={isJudgeDemo ? "PR Meltdown (Judge Demo · 90s)" : "PR Meltdown"}
          appliedBeatCount={appliedBeatCount}
          totalBeatCount={totalBeatCount}
          lastCoachingNote={lastCoachingNote}
          runEnded={runEnded}
          isStarting={isStarting}
          isFinalizing={isFinalizing}
          pageError={pageError}
          isDevMode={IS_DEV_MODE}
          canEndNow={Boolean(episode && runState)}
          onStartStandard={() => void handleStart("standard")}
          onStartJudgeDemo={() => void handleStart("judge_demo")}
          onEndNow={handleEndNow}
        />

        <section className="glass-panel flex flex-wrap items-center gap-2 p-2">
          <span className="px-2 text-xs uppercase tracking-[0.14em] text-zinc-500">View Mode</span>
          <button
            type="button"
            onClick={() => setViewMode("board")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              viewMode === "board" ? "glow-border-cyan bg-cyan-700/80 text-cyan-50" : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode("focus_feed")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              viewMode === "focus_feed"
                ? "glow-border-cyan bg-cyan-700/80 text-cyan-50"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            Feed Focus
          </button>
          <button
            type="button"
            onClick={() => setViewMode("focus_actions")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              viewMode === "focus_actions"
                ? "glow-border-cyan bg-cyan-700/80 text-cyan-50"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
            }`}
          >
            Action Focus
          </button>
        </section>

        <section className={`glass-panel grid gap-2 p-3 text-[11px] uppercase tracking-[0.12em] text-zinc-300 ${isJudgeDemo ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <div className="rounded border border-cyan-700/40 bg-cyan-950/20 px-3 py-2">
            <span className="font-bold text-cyan-300">Public Feed:</span> external sentiment stream (read-only)
          </div>
          <div className="rounded border border-emerald-700/40 bg-emerald-950/20 px-3 py-2">
            <span className="font-bold text-emerald-300">Internal Chat:</span> team inbound messages (read-only)
          </div>
          <div className="rounded border border-amber-700/40 bg-amber-950/20 px-3 py-2">
            <span className="font-bold text-amber-300">Command Console:</span> where you submit decisions
          </div>
          {isJudgeDemo ? (
            <div className="rounded border border-rose-700/40 bg-rose-950/20 px-3 py-2">
              <span className="font-bold text-rose-300">Demo Auto:</span> strong action @00:18, weak action @00:52
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div
            className={
              viewMode === "focus_feed"
                ? "xl:col-span-6"
                : viewMode === "focus_actions"
                  ? "xl:col-span-3"
                  : "xl:col-span-4"
            }
          >
            <OpsRoomPublicFeed feedItems={feedItems} />
          </div>

          <div
            className={
              viewMode === "focus_actions"
                ? "xl:col-span-6"
                : viewMode === "focus_feed"
                  ? "xl:col-span-3"
                  : "xl:col-span-4"
            }
          >
            <div className="flex flex-col gap-4">
              <OpsRoomInternalChat internalMessages={internalMessages} />
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
          </div>

          <div className={viewMode === "board" ? "xl:col-span-4" : "xl:col-span-3"}>
            <OpsRoomIncomingCall
              callPersona={callPersona}
              callHistory={callHistory}
              selectedReplyTargetId={selectedReplyTargetId}
              selectedReplyTargetText={selectedReplyTargetText}
              callAudioUrl={callAudioUrl}
              isCallRinging={isCallRinging}
              isCallActive={isCallActive}
              isCallEnded={isCallEnded}
              isReporterResponding={isReporterResponding}
              autoPlayBlocked={autoPlayBlocked}
              callError={callError}
              isLoadingCallAudio={isLoadingCallAudio}
              callDraftText={callDraftText}
              isSpeechToTextSupported={isSpeechToTextSupported}
              isListeningToCall={isListeningToCall}
              audioRef={audioRef}
              onCallDraftChange={setCallDraftText}
              onAnswerCall={handleAnswerCall}
              onSendCallResponse={() => void handleCallResponse()}
              onToggleCallListening={handleToggleCallListening}
              onSelectReplyTarget={handleSelectReplyTarget}
              onSelectLatestReplyTarget={handleSelectLatestReplyTarget}
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-12">
            <OpsRoomActivityLog runLog={runLog} />
          </div>
        </section>
      </div>
    </main>
  );
}
