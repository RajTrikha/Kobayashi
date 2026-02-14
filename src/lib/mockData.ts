import { nanoid } from "nanoid";

import type {
  AfterActionRequest,
  AfterActionResponse,
  EvaluateEpisodeRequest,
  EvaluateEpisodeResponse,
  GenerateEpisodeRequest,
  GenerateEpisodeResponse,
  RunState,
} from "@/lib/schemas";

const ROUND_LENGTH_SEC = 8 * 60;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function legalRiskBySentiment(sentiment: number): "low" | "medium" | "high" {
  if (sentiment < 30) {
    return "high";
  }
  if (sentiment < 55) {
    return "medium";
  }
  return "low";
}

function velocityByDelta(delta: number): "falling" | "steady" | "rising" {
  if (delta >= 4) {
    return "falling";
  }
  if (delta <= -4) {
    return "rising";
  }
  return "steady";
}

export function deriveReadinessScore(state: Omit<RunState, "readinessScore">): number {
  const legalPenalty = { low: 0, medium: 8, high: 18 }[state.legalRisk];
  const velocityPenalty = { falling: 0, steady: 5, rising: 12 }[state.newsVelocity];
  const timeFactor = Math.round((state.timeRemainingSec / ROUND_LENGTH_SEC) * 20);
  const base =
    Math.round(state.publicSentiment * 0.4 + state.trustScore * 0.45 + timeFactor) -
    legalPenalty -
    velocityPenalty;

  return clamp(base, 0, 100);
}

function buildInitialState(seed: number): RunState {
  const baseSentiment = 42 + (seed % 7);
  const baseTrust = 45 + (seed % 9);

  const stateWithoutReadiness: Omit<RunState, "readinessScore"> = {
    publicSentiment: clamp(baseSentiment, 0, 100),
    trustScore: clamp(baseTrust, 0, 100),
    legalRisk: "medium",
    newsVelocity: "rising",
    timeRemainingSec: ROUND_LENGTH_SEC,
  };

  return {
    ...stateWithoutReadiness,
    readinessScore: deriveReadinessScore(stateWithoutReadiness),
  };
}

export function createMockEpisode(input: GenerateEpisodeRequest): GenerateEpisodeResponse {
  const seedBase = input.seed ?? hashSeed(`${input.pack}|${input.role}|${input.org}`);
  const runId = `run_${nanoid(10)}`;
  const episodeId = `ep_${seedBase.toString(16).slice(0, 8)}`;

  const initialState = buildInitialState(seedBase);

  const episode = {
    episodeId,
    title: "PR Meltdown: Grounded Confidence",
    role: input.role,
    org: input.org,
    objective:
      "Contain speculation, protect trust, and reduce legal exposure while coordinating internal teams.",
    initialState,
    beats: [
      {
        id: "beat_001",
        atSec: 20,
        feedItems: [
          {
            id: "feed_001",
            source: "Metro Ledger",
            text: `${input.org} flight disruption footage is trending with claims of avoidable errors.`,
            tone: "critical" as const,
          },
        ],
        internalMessages: [
          {
            id: "im_001",
            from: "Ops Lead",
            text: "Call center queue doubled in five minutes. We need a customer-facing line now.",
            channel: "#incident-war-room",
            priority: "high" as const,
          },
        ],
      },
      {
        id: "beat_002",
        atSec: 90,
        feedItems: [
          {
            id: "feed_002",
            source: "CityLive Wire",
            text: "Anonymous employee post alleges maintenance shortcuts; allegation unverified.",
            tone: "concerned" as const,
          },
        ],
        internalMessages: [
          {
            id: "im_002",
            from: "Legal Counsel",
            text: "Do not state root cause until verification. Acknowledge impact without admitting fault.",
            channel: "#incident-war-room",
            priority: "high" as const,
          },
        ],
        call: {
          persona: "Riley Trent, Metro Ledger reporter",
          transcript:
            "This is Riley Trent with Metro Ledger. We have witnesses claiming your team ignored warning signs. Are you accepting responsibility today?",
          ttsText:
            "This is Riley Trent from Metro Ledger. Witnesses claim your team ignored warning signs. Are you accepting responsibility today?",
        },
      },
      {
        id: "beat_003",
        atSec: 210,
        feedItems: [
          {
            id: "feed_003",
            source: "Market Pulse",
            text: "Customer advocates demand a direct support hotline and compensation timeline.",
            tone: "concerned" as const,
          },
        ],
        internalMessages: [
          {
            id: "im_003",
            from: "Support Director",
            text: "Agents need approved language before next shift starts.",
            channel: "#support-ops",
            priority: "normal" as const,
          },
        ],
      },
    ],
    scoringRubric: {
      acknowledgment: 0.2,
      clarity: 0.2,
      actionability: 0.2,
      escalation: 0.1,
      legalSafety: 0.2,
      empathy: 0.1,
    },
    constraints: [
      {
        id: "constraint_legal_1",
        title: "No Unverified Admissions",
        description: "Avoid admitting cause or liability before legal verification.",
      },
      {
        id: "constraint_ops_1",
        title: "Protect Customer Trust",
        description: "Prioritize clear customer steps and support channels.",
      },
    ],
  };

  return {
    runId,
    episodeId,
    episode,
    runState: initialState,
    startedAt: new Date().toISOString(),
    mode: "mock",
  };
}

function scoreAction(action: string): {
  sentimentDelta: number;
  trustDelta: number;
  scoreDelta: number;
  coachingNote: string;
  suggestion?: string;
} {
  const normalized = action.toLowerCase();

  let sentimentDelta = 0;
  let trustDelta = 0;
  let scoreDelta = 0;

  if (/sorry|apolog|understand|hear/i.test(normalized)) {
    sentimentDelta += 3;
    trustDelta += 2;
    scoreDelta += 2;
  }

  if (/investigat|review|verify|facts/i.test(normalized)) {
    sentimentDelta += 1;
    trustDelta += 2;
    scoreDelta += 2;
  }

  if (/hotline|support|refund|rebook|assist/i.test(normalized)) {
    sentimentDelta += 3;
    trustDelta += 2;
    scoreDelta += 3;
  }

  if (/legal|counsel|compliance/i.test(normalized)) {
    trustDelta += 1;
    scoreDelta += 1;
  }

  if (/no comment|can't comment|cannot comment/i.test(normalized)) {
    sentimentDelta -= 4;
    trustDelta -= 3;
    scoreDelta -= 4;
  }

  if (/fault|liable|our mistake|we caused/i.test(normalized)) {
    sentimentDelta -= 2;
    trustDelta -= 1;
    scoreDelta -= 3;
  }

  sentimentDelta = clamp(sentimentDelta, -10, 10);
  trustDelta = clamp(trustDelta, -10, 10);
  scoreDelta = clamp(scoreDelta, -10, 10);

  let coachingNote = "Your response was received. Add explicit next steps to improve confidence.";
  let suggestion: string | undefined;

  if (scoreDelta >= 4) {
    coachingNote = "Strong move. You balanced empathy and verifiable action while reducing speculation.";
    suggestion = "Draft internal memo aligning legal, support, and media responses.";
  } else if (scoreDelta <= -3) {
    coachingNote = "Risk is increasing. Acknowledge impact, avoid unverified admissions, and provide concrete support actions.";
    suggestion = "Send a concise holding statement with customer help channels and review timeline.";
  }

  return { sentimentDelta, trustDelta, scoreDelta, coachingNote, suggestion };
}

export function evaluateMockAction(input: EvaluateEpisodeRequest): EvaluateEpisodeResponse {
  const scored = scoreAction(input.action);

  const nextPublicSentiment = clamp(
    input.runState.publicSentiment + scored.sentimentDelta,
    0,
    100,
  );
  const nextTrust = clamp(input.runState.trustScore + scored.trustDelta, 0, 100);

  const stateWithoutReadiness: Omit<RunState, "readinessScore"> = {
    publicSentiment: nextPublicSentiment,
    trustScore: nextTrust,
    legalRisk: legalRiskBySentiment(nextPublicSentiment),
    newsVelocity: velocityByDelta(scored.sentimentDelta),
    timeRemainingSec: Math.max(0, input.runState.timeRemainingSec - 20),
  };

  const updatedReadiness = deriveReadinessScore(stateWithoutReadiness);

  return {
    stateDelta: {
      publicSentiment: scored.sentimentDelta,
      trustScore: scored.trustDelta,
      legalRisk: stateWithoutReadiness.legalRisk,
      newsVelocity: stateWithoutReadiness.newsVelocity,
      timeRemainingSec: -20,
    },
    scoreDelta: scored.scoreDelta,
    coachingNote: scored.coachingNote,
    suggestedNextAction: scored.suggestion,
    updatedState: {
      ...stateWithoutReadiness,
      readinessScore: updatedReadiness,
    },
    updatedReadiness,
    mode: "mock",
  };
}

export function createMockAfterAction(input: AfterActionRequest): AfterActionResponse {
  const actionCount = input.runLog.filter((entry) => entry.type === "action").length;

  const aarMarkdown = [
    "# After-Action Report",
    "",
    "## Timeline Snapshot",
    `- Run ID: ${input.runId}`,
    `- Total logged events: ${input.runLog.length}`,
    `- Player actions submitted: ${actionCount}`,
    "",
    "## What Went Well",
    "- Response cadence stayed consistent through high-velocity updates.",
    "- Messaging prioritized customer impact and operational next steps.",
    "",
    "## What Missed",
    "- Initial statements could have included clearer ownership for follow-up.",
    "- Internal alignment with support should occur earlier in the timeline.",
    "",
    "## Recommended Runbook",
    "1. Publish a factual holding statement within first 90 seconds.",
    "2. Stand up a support channel script before second media wave.",
    "3. Escalate legal review in parallel with customer comms updates.",
  ].join("\n");

  return {
    runId: input.runId,
    aarMarkdown,
    artifacts: {
      holding_statement:
        "SkyWave Air is actively addressing today\'s disruption. We are prioritizing passenger support, verifying facts, and will share confirmed updates on a rolling basis.",
      reporter_email:
        "Subject: Statement on today\'s disruption\n\nHi Riley, we can confirm our teams are reviewing all operational data and customer reports. We will provide verified updates and support actions as they are confirmed.",
      support_script:
        "Thank you for contacting SkyWave Air. We understand the disruption has been stressful. We are actively resolving impacted itineraries and can assist with rebooking and care options now.",
      internal_memo:
        "Comms, Legal, Ops, and Support will align on a single source-of-truth update every 20 minutes. No unverified root-cause language is approved for external use.",
    },
    mode: "mock",
  };
}

export function createMockTtsAudio(payload: { text: string; voiceId: string; persona: string }): Buffer {
  const prefix = Buffer.from([0x49, 0x44, 0x33]);
  const body = Buffer.from(
    `MOCK_TTS|voice=${payload.voiceId}|persona=${payload.persona}|text=${payload.text.slice(0, 180)}`,
    "utf8",
  );

  return Buffer.concat([prefix, body]);
}
