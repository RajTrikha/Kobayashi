import { nanoid } from "nanoid";

import type {
  AfterActionRequest,
  AfterActionResponse,
  EvaluateEpisodeRequest,
  EvaluateEpisodeResponse,
  GenerateEpisodeRequest,
  GenerateEpisodeResponse,
  ReporterRespondRequest,
  ReporterRespondResponse,
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
    return "rising";
  }
  if (delta <= -4) {
    return "falling";
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
        atSec: 180,
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
      {
        id: "beat_004",
        atSec: 300,
        feedItems: [
          {
            id: "feed_004",
            source: "AviationInsider",
            text: `Breaking: Second ${input.org} flight diverted mid-route. Passengers report conflicting information from crew.`,
            tone: "critical" as const,
          },
          {
            id: "feed_005",
            source: "Social Pulse",
            text: `#Boycott${input.org.replace(/\s/g, "")} trending nationally. Customer-shot video has 2.1M views and climbing.`,
            tone: "critical" as const,
          },
        ],
        internalMessages: [
          {
            id: "im_004",
            from: "VP Operations",
            text: "Board wants a briefing in 30 minutes. We need a one-page executive summary of our response so far.",
            channel: "#incident-war-room",
            priority: "high" as const,
          },
        ],
      },
      {
        id: "beat_005",
        atSec: 400,
        feedItems: [
          {
            id: "feed_006",
            source: "National Wire",
            text: "FAA confirms it is reviewing operational data. Shares down 4% in after-hours trading.",
            tone: "critical" as const,
          },
        ],
        internalMessages: [
          {
            id: "im_005",
            from: "Investor Relations",
            text: "Analysts are asking if we'll issue a formal shareholder notice. Need guidance on messaging.",
            channel: "#incident-war-room",
            priority: "normal" as const,
          },
          {
            id: "im_006",
            from: "CEO Office",
            text: "CEO wants to know: are we ahead of this or behind it? Give me one sentence.",
            channel: "#incident-war-room",
            priority: "high" as const,
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
  const beatCount = input.runLog.filter((entry) => entry.type === "beat").length;
  const evalCount = input.runLog.filter((entry) => entry.type === "evaluation").length;

  const sentiment = input.finalState.publicSentiment;
  const trust = input.finalState.trustScore;
  const readiness = input.finalState.readinessScore;
  const risk = input.finalState.legalRisk;

  const grade =
    readiness >= 70 ? "A" : readiness >= 55 ? "B" : readiness >= 40 ? "C" : readiness >= 25 ? "D" : "F";
  const gradeLabel =
    readiness >= 70
      ? "Strong — decisive action under pressure"
      : readiness >= 55
        ? "Solid — room to tighten timing and escalation"
        : readiness >= 40
          ? "Mixed — key windows were missed"
          : "Needs Work — critical gaps in crisis response";

  const wellPoints: string[] = [];
  const missedPoints: string[] = [];

  if (actionCount >= 3) {
    wellPoints.push("Maintained a steady response cadence throughout the crisis window.");
  }
  if (sentiment >= 50) {
    wellPoints.push("Public sentiment held above the critical threshold, indicating effective audience management.");
  }
  if (trust >= 50) {
    wellPoints.push("Trust score remained stable, suggesting consistent and credible messaging.");
  }
  if (risk === "low") {
    wellPoints.push("Legal exposure stayed contained — language discipline was strong.");
  }

  if (wellPoints.length === 0) {
    wellPoints.push("Engaged with the crisis scenario and submitted responses under time pressure.");
  }

  if (actionCount < 2) {
    missedPoints.push("Response volume was low. In a live crisis, silence is interpreted as avoidance.");
  }
  if (sentiment < 40) {
    missedPoints.push("Public sentiment dropped significantly. Earlier acknowledgment could have slowed the decline.");
  }
  if (trust < 40) {
    missedPoints.push("Trust eroded below recovery threshold. Concrete next-steps and transparency were needed sooner.");
  }
  if (risk === "high") {
    missedPoints.push("Legal risk escalated to high. Unverified admissions or unclear language may have contributed.");
  }

  if (missedPoints.length === 0) {
    missedPoints.push("Minor: Initial holding statement could include more specific customer support actions.");
  }

  const aarMarkdown = [
    "# After-Action Report",
    "",
    `**Overall Grade: ${grade}** — ${gradeLabel}`,
    "",
    "## Timeline Snapshot",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Run ID | ${input.runId} |`,
    `| Total Events | ${input.runLog.length} |`,
    `| Beats Triggered | ${beatCount} |`,
    `| Actions Submitted | ${actionCount} |`,
    `| Evaluations | ${evalCount} |`,
    "",
    "## Final State",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Public Sentiment | ${sentiment}/100 |`,
    `| Trust Score | ${trust}/100 |`,
    `| Readiness Score | ${readiness}/100 |`,
    `| Legal Risk | ${risk} |`,
    `| News Velocity | ${input.finalState.newsVelocity} |`,
    "",
    "## What Went Well",
    ...wellPoints.map((point) => `- ${point}`),
    "",
    "## What Missed",
    ...missedPoints.map((point) => `- ${point}`),
    "",
    "## Recommended Runbook",
    "1. Publish a factual holding statement within the first 90 seconds of any crisis trigger.",
    "2. Stand up a support channel script before the second media wave hits.",
    "3. Escalate legal review in parallel with — not after — customer comms updates.",
    "4. Align all internal teams on a single source-of-truth cadence (every 20 minutes).",
    "5. Prepare a reporter response template that acknowledges concern without admitting cause.",
  ].join("\n");

  return {
    runId: input.runId,
    aarMarkdown,
    artifacts: {
      holding_statement:
        "SkyWave Air is actively addressing today's disruption. We are prioritizing passenger support, verifying all operational facts, and will share confirmed updates on a rolling basis. Affected passengers can reach our dedicated support line at 1-800-SKYWAVE for immediate rebooking and care assistance.",
      reporter_email:
        "Subject: SkyWave Air — Statement on Today's Service Disruption\n\nRiley,\n\nThank you for reaching out. We can confirm our operations and safety teams are conducting a thorough review of all relevant data and customer reports.\n\nWe are committed to transparency and will provide verified updates as they are confirmed. In the meantime, affected customers are being assisted through our dedicated support channels.\n\nWe will have a follow-up statement within the next two hours.\n\nBest,\nHead of Communications\nSkyWave Air",
      support_script:
        "Thank you for contacting SkyWave Air. We understand today's disruption has been stressful, and we sincerely apologize for the inconvenience.\n\nHere's what we can do for you right now:\n• Rebooking: We can place you on the next available flight at no additional cost\n• Accommodation: If your flight is delayed overnight, we will arrange hotel and meal vouchers\n• Refund: Full refund requests can be processed immediately\n\nIs there a specific way I can help you today?",
      internal_memo:
        "INTERNAL — DO NOT DISTRIBUTE EXTERNALLY\n\nEffective immediately, all external communications must be approved through the incident war room.\n\nKey protocols:\n1. Comms, Legal, Ops, and Support will sync every 20 minutes via #incident-war-room\n2. No root-cause language is approved for external use until verification is complete\n3. Customer-facing teams should use the approved support script only\n4. Media inquiries route to Head of Comms — no individual responses\n5. Next leadership briefing: [scheduled time]\n\nQuestions → #incident-war-room",
    },
    mode: "mock",
  };
}

export function createMockTtsAudio(_payload: { text: string; voiceId: string; persona: string }): Buffer {
  // Generate a valid WAV file with ~1 second of silence so browsers can play it
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate; // 1 second
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize); // 44-byte header + PCM data (zeros = silence)

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  // PCM data is all zeros (silence) from Buffer.alloc

  return buffer;
}

export function createMockReporterReply(input: ReporterRespondRequest): ReporterRespondResponse {
  const playerTurns = input.conversationHistory.filter((turn) => turn.speaker === "player").length;
  const reporterName = input.persona.split(",")[0]?.trim() || "Reporter";
  const mentionTimeline = /when|timeline|eta|hours|today|update/i.test(input.userResponse);
  const mentionCustomers = /customer|passenger|support|hotline|refund/i.test(input.userResponse);

  if (playerTurns <= 1) {
    const reporterReply = mentionTimeline
      ? "Can you give a concrete timestamp for your next verified update and confirm who signs off on it?"
      : "Can you be specific about what your team is doing right now for affected passengers and when they should expect an update?";
    return {
      reporterReply,
      ttsText: reporterReply,
      tone: "pressing",
      shouldContinue: true,
      mode: "mock",
    };
  }

  if (playerTurns === 2) {
    const reporterReply = mentionCustomers
      ? "Our sources say customers are still getting mixed answers. What single message should they rely on in the next hour?"
      : "Our sources say internal teams are giving conflicting guidance. Who is the final decision-maker for public messaging right now?";
    return {
      reporterReply,
      ttsText: reporterReply,
      tone: "skeptical",
      shouldContinue: true,
      mode: "mock",
    };
  }

  const reporterReply = `Thanks. I'll include your statement in our update, ${reporterName} signing off for now.`;
  return {
    reporterReply,
    ttsText: reporterReply,
    tone: "closing",
    shouldContinue: false,
    mode: "mock",
  };
}
