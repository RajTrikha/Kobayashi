import { nanoid } from "nanoid";
import { z } from "zod";

import { getRuntimeEnv } from "@/lib/config";
import {
  afterActionArtifactsSchema,
  episodeSchema,
  type AfterActionRequest,
  type AfterActionResponse,
  type EvaluateEpisodeRequest,
  type EvaluateEpisodeResponse,
  type GenerateEpisodeRequest,
  type GenerateEpisodeResponse,
  type ReporterRespondRequest,
  type ReporterRespondResponse,
  type RunState,
} from "@/lib/schemas";
import { createMockEpisode, deriveReadinessScore } from "@/lib/mockData";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const REQUEST_TIMEOUT_MS = 15_000;

const rubricAxisSchema = z
  .object({
    acknowledgment: z.number().min(0).max(5),
    clarity: z.number().min(0).max(5),
    actionability: z.number().min(0).max(5),
    escalation: z.number().min(0).max(5),
    legalSafety: z.number().min(0).max(5),
    empathy: z.number().min(0).max(5),
  })
  .strict();

const evaluateOutputSchema = z
  .object({
    axes: rubricAxisSchema,
    coachingNote: z.string().min(1),
    suggestedNextAction: z.string().min(1).optional(),
    legalRisk: z.enum(["low", "medium", "high"]).optional(),
    newsVelocity: z.enum(["falling", "steady", "rising"]).optional(),
  })
  .strict();

const afterActionOutputSchema = z
  .object({
    aarMarkdown: z.string().min(1),
    artifacts: afterActionArtifactsSchema,
  })
  .strict();

const reporterRespondOutputSchema = z
  .object({
    reporterReply: z.string().min(1).max(600),
    ttsText: z.string().min(1).max(600).optional(),
    tone: z.enum(["neutral", "pressing", "skeptical", "closing"]),
    shouldContinue: z.boolean(),
  })
  .strict();

const looseBeatSchema = z
  .object({
    id: z.string().optional(),
    atSec: z.number().int().optional(),
    timeElapsedSec: z.number().int().optional(),
    type: z.string().optional(),
    title: z.string().optional(),
    triggerDescription: z.string().optional(),
    inquiryFocus: z.string().optional(),
    communicationStrategy: z.string().optional(),
    stakeholderImpact: z.string().optional(),
    actionItems: z.array(z.string()).optional(),
    persona: z.string().optional(),
  })
  .passthrough();

const looseEpisodeSchema = z
  .object({
    episodeId: z.string().optional(),
    id: z.string().optional(),
    title: z.string().optional(),
    scenarioTitle: z.string().optional(),
    role: z.string().optional(),
    org: z.string().optional(),
    orgName: z.string().optional(),
    objective: z.string().optional(),
    initialContext: z.string().optional(),
    timeRemainingSec: z.number().int().optional(),
    initialState: z
      .object({
        publicSentiment: z.number().optional(),
        trustScore: z.number().optional(),
        legalRisk: z.enum(["low", "medium", "high"]).optional(),
        newsVelocity: z.enum(["falling", "steady", "rising"]).optional(),
        timeRemainingSec: z.number().int().optional(),
      })
      .passthrough()
      .optional(),
    beats: z.array(looseBeatSchema).optional(),
    scoringRubric: z.record(z.string(), z.number()).optional(),
    constraints: z.array(z.unknown()).optional(),
  })
  .passthrough();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function deriveLegalRisk(sentiment: number, legalSafetyScore: number): "low" | "medium" | "high" {
  if (legalSafetyScore <= 1) {
    return "high";
  }
  if (legalSafetyScore <= 2 || sentiment < 45) {
    return "medium";
  }
  return "low";
}

function deriveNewsVelocity(sentimentDelta: number): "falling" | "steady" | "rising" {
  if (sentimentDelta >= 3) {
    return "falling";
  }
  if (sentimentDelta <= -3) {
    return "rising";
  }
  return "steady";
}

function toSentence(input: string): string {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "";
  }
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function firstString(values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function coerceGeneratedEpisode(
  rawEpisode: unknown,
  request: GenerateEpisodeRequest,
): z.infer<typeof episodeSchema> | null {
  const direct = episodeSchema.safeParse(rawEpisode);
  if (direct.success) {
    return direct.data;
  }

  const loose = looseEpisodeSchema.safeParse(rawEpisode);
  if (!loose.success) {
    return null;
  }

  const baseEpisode = createMockEpisode(request).episode;
  const data = loose.data;
  const looseBeats = data.beats ?? [];
  const targetBeatCount = clamp(looseBeats.length || baseEpisode.beats.length, 3, 5);
  const baseBeats = baseEpisode.beats.slice(0, targetBeatCount);

  const rawInitialTime =
    data.initialState?.timeRemainingSec ?? data.timeRemainingSec ?? baseEpisode.initialState.timeRemainingSec;
  const initialTime = clamp(rawInitialTime, 180, 480);
  const initialWithoutReadiness: Omit<RunState, "readinessScore"> = {
    publicSentiment: clamp(
      Math.round(data.initialState?.publicSentiment ?? baseEpisode.initialState.publicSentiment),
      0,
      100,
    ),
    trustScore: clamp(Math.round(data.initialState?.trustScore ?? baseEpisode.initialState.trustScore), 0, 100),
    legalRisk: data.initialState?.legalRisk ?? baseEpisode.initialState.legalRisk,
    newsVelocity: data.initialState?.newsVelocity ?? baseEpisode.initialState.newsVelocity,
    timeRemainingSec: initialTime,
  };

  const normalizedBeats = baseBeats.map((baseBeat, index) => {
    const looseBeat = looseBeats[index];
    if (!looseBeat) {
      return baseBeat;
    }

    const combinedNarrative = toSentence(
      [
        firstString([looseBeat.triggerDescription, looseBeat.title]),
        firstString([looseBeat.stakeholderImpact, looseBeat.communicationStrategy]),
      ]
        .filter(Boolean)
        .join(" "),
    );
    const feedText = combinedNarrative || baseBeat.feedItems[0]?.text || `${request.org} faces mounting scrutiny.`;
    const internalText = toSentence(
      firstString([
        looseBeat.communicationStrategy,
        Array.isArray(looseBeat.actionItems) ? looseBeat.actionItems.join("; ") : null,
        looseBeat.stakeholderImpact,
      ]) ?? baseBeat.internalMessages[0]?.text ?? "Align legal and comms guidance before the next media cycle.",
    );

    const beatType = (looseBeat.type ?? "").toLowerCase();
    const hasReporterIntent =
      Boolean(looseBeat.persona) ||
      Boolean(looseBeat.inquiryFocus) ||
      /report|media|press|call/.test(beatType);
    const reporterQuestion = toSentence(
      firstString([looseBeat.inquiryFocus, looseBeat.triggerDescription, looseBeat.title]) ??
        "Can you clarify what your team is doing right now for affected passengers?",
    );
    const callPersona = firstString([looseBeat.persona]) ?? "Riley Trent, Metro Ledger reporter";
    const atSecCandidate = looseBeat.atSec ?? looseBeat.timeElapsedSec ?? baseBeat.atSec;

    return {
      ...baseBeat,
      id: firstString([looseBeat.id]) ?? baseBeat.id,
      atSec: clamp(Math.round(atSecCandidate), 15, Math.max(30, initialTime - 10)),
      feedItems: [
        {
          ...baseBeat.feedItems[0],
          id: `${firstString([looseBeat.id]) ?? baseBeat.id}_feed_01`,
          source: hasReporterIntent ? "Metro Ledger" : baseBeat.feedItems[0]?.source ?? "Public Feed",
          text: feedText,
          tone: hasReporterIntent || /critical|alert|escalat/.test(beatType) ? "critical" : baseBeat.feedItems[0]?.tone ?? "concerned",
        },
      ],
      internalMessages: [
        {
          ...baseBeat.internalMessages[0],
          id: `${firstString([looseBeat.id]) ?? baseBeat.id}_im_01`,
          text: internalText,
        },
      ],
      call: hasReporterIntent
        ? {
            persona: callPersona,
            transcript: reporterQuestion,
            ttsText: reporterQuestion,
          }
        : baseBeat.call,
    };
  });

  let previousAtSec = 0;
  const stabilizedBeats = normalizedBeats.map((beat, index) => {
    const maxForBeat = Math.max(30, initialTime - (targetBeatCount - index) * 10);
    const atSec = clamp(Math.max(beat.atSec, previousAtSec + 20), 15, maxForBeat);
    previousAtSec = atSec;
    return {
      ...beat,
      atSec,
    };
  });

  if (!stabilizedBeats.some((beat) => beat.call)) {
    stabilizedBeats[Math.min(1, stabilizedBeats.length - 1)] = {
      ...stabilizedBeats[Math.min(1, stabilizedBeats.length - 1)],
      call: baseEpisode.beats[1]?.call ?? baseEpisode.beats[0]?.call,
    };
  }

  const candidateEpisode: z.infer<typeof episodeSchema> = {
    episodeId: firstString([data.episodeId, data.id]) ?? baseEpisode.episodeId,
    title: firstString([data.title, data.scenarioTitle]) ?? baseEpisode.title,
    role: request.role,
    org: request.org,
    objective:
      firstString([data.objective, data.initialContext]) ??
      baseEpisode.objective,
    initialState: {
      ...initialWithoutReadiness,
      readinessScore: deriveReadinessScore(initialWithoutReadiness),
    },
    beats: stabilizedBeats,
    scoringRubric: baseEpisode.scoringRubric,
    constraints: baseEpisode.constraints,
  };

  const finalParse = episodeSchema.safeParse(candidateEpisode);
  return finalParse.success ? finalParse.data : null;
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }

  throw new Error("No JSON object found in Anthropic response.");
}

async function callAnthropicForJson<T>(input: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  const env = getRuntimeEnv();
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key missing.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 1500,
        temperature: 0,
        system: `${input.system}\nReturn JSON only. No markdown, no backticks.`,
        messages: [{ role: "user", content: input.prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Anthropic request failed (${response.status}): ${details.slice(0, 220)}`);
    }

    const responseJson = await response.json();
    const textSegments = Array.isArray(responseJson?.content)
      ? responseJson.content
          .filter((entry: unknown) =>
            typeof entry === "object" && entry !== null && (entry as { type?: string }).type === "text",
          )
          .map((entry: unknown) => (entry as { text?: string }).text ?? "")
      : [];

    const rawText = textSegments.join("\n").trim();
    if (!rawText) {
      throw new Error("Anthropic response text was empty.");
    }

    const jsonText = extractJsonBlock(rawText);
    const parsedJson: unknown = JSON.parse(jsonText);
    return input.schema.parse(parsedJson);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateEpisodeLive(
  request: GenerateEpisodeRequest,
): Promise<GenerateEpisodeResponse | null> {
  const outputSchema = z.object({ episode: z.unknown() }).passthrough();

  const system =
    "You design deterministic corporate crisis simulation episodes for judge demos. Keep company and media fictional and non-political. You must return exactly the requested schema keys.";

  const prompt = [
    "Create one PR Meltdown episode JSON.",
    `pack: ${request.pack}`,
    `role: ${request.role}`,
    `org: ${request.org}`,
    `seed: ${request.seed ?? "none"}`,
    "Constraints:",
    "- 8 minute scenario (timeRemainingSec 480)",
    "- Include 3 to 5 beats and at least one reporter call beat",
    "- Keep values bounded to the schema ranges",
    "- Use fictional outlets/personas only",
    "Return shape exactly: {",
    '  "episode": {',
    '    "episodeId": "string",',
    '    "title": "string",',
    '    "role": "string",',
    '    "org": "string",',
    '    "objective": "string",',
    '    "initialState": { "publicSentiment": 0-100, "trustScore": 0-100, "legalRisk": "low|medium|high", "newsVelocity": "falling|steady|rising", "timeRemainingSec": 480, "readinessScore": 0-100 },',
    '    "beats": [{ "id":"string","atSec":number,"feedItems":[{"id":"string","source":"string","text":"string","tone":"neutral|concerned|critical"}],"internalMessages":[{"id":"string","from":"string","text":"string","channel":"string","priority":"low|normal|high"}],"call":{"transcript":"string","ttsText":"string","persona":"string"}? }],',
    '    "scoringRubric": { "acknowledgment": 0-1, "clarity": 0-1, "actionability": 0-1, "escalation": 0-1, "legalSafety": 0-1, "empathy": 0-1 },',
    '    "constraints": [{ "id":"string","title":"string","description":"string" }]',
    "  }",
    "}",
  ].join("\n");

  try {
    const parsed = await callAnthropicForJson({
      system,
      prompt,
      schema: outputSchema,
    });
    const normalizedEpisode = coerceGeneratedEpisode(parsed.episode, request);
    if (!normalizedEpisode) {
      throw new Error("Anthropic episode could not be normalized to schema.");
    }

    return {
      runId: `run_${nanoid(10)}`,
      episodeId: normalizedEpisode.episodeId,
      episode: {
        ...normalizedEpisode,
        role: request.role,
        org: request.org,
      },
      runState: normalizedEpisode.initialState,
      startedAt: new Date().toISOString(),
      mode: "live",
    };
  } catch (error) {
    console.warn("[generateEpisodeLive] fallback to mock:", error);
    return null;
  }
}

export async function evaluateEpisodeLive(
  request: EvaluateEpisodeRequest,
): Promise<EvaluateEpisodeResponse | null> {
  const system =
    "You are a crisis communications evaluator. Score short responses and return compact JSON with no extra text.";

  const prompt = [
    "Evaluate the player's action for a PR crisis simulation.",
    `action: ${request.action}`,
    `runState: ${JSON.stringify(request.runState)}`,
    `context: ${JSON.stringify(request.context ?? {})}`,
    "Return JSON with:",
    "- axes: acknowledgment, clarity, actionability, escalation, legalSafety, empathy (0..5)",
    "- coachingNote (short)",
    "- suggestedNextAction (optional short)",
    "- legalRisk (optional enum low|medium|high)",
    "- newsVelocity (optional enum falling|steady|rising)",
  ].join("\n");

  try {
    const parsed = await callAnthropicForJson({
      system,
      prompt,
      schema: evaluateOutputSchema,
    });

    const axis = parsed.axes;

    const sentimentBase = (axis.acknowledgment + axis.empathy + axis.actionability + axis.clarity - 10) / 2;
    const trustBase = (axis.clarity + axis.actionability + axis.escalation + axis.legalSafety - 10) / 2;
    const legalPenalty = axis.legalSafety <= 1 ? -3 : axis.legalSafety <= 2 ? -1 : 0;

    const sentimentDelta = clamp(Math.round(sentimentBase + legalPenalty), -10, 10);
    const trustDelta = clamp(Math.round(trustBase + legalPenalty), -10, 10);

    const weightedScore =
      axis.acknowledgment * 0.18 +
      axis.clarity * 0.2 +
      axis.actionability * 0.2 +
      axis.escalation * 0.12 +
      axis.legalSafety * 0.2 +
      axis.empathy * 0.1;
    const scoreDelta = clamp(Math.round((weightedScore - 2.5) * 3 + legalPenalty), -10, 10);

    const nextPublicSentiment = clamp(request.runState.publicSentiment + sentimentDelta, 0, 100);
    const nextTrustScore = clamp(request.runState.trustScore + trustDelta, 0, 100);

    const legalRisk = parsed.legalRisk ?? deriveLegalRisk(nextPublicSentiment, axis.legalSafety);
    const newsVelocity = parsed.newsVelocity ?? deriveNewsVelocity(sentimentDelta);

    const nextStateWithoutReadiness: Omit<RunState, "readinessScore"> = {
      publicSentiment: nextPublicSentiment,
      trustScore: nextTrustScore,
      legalRisk,
      newsVelocity,
      timeRemainingSec: Math.max(0, request.runState.timeRemainingSec - 20),
    };

    const updatedReadiness = deriveReadinessScore(nextStateWithoutReadiness);

    return {
      stateDelta: {
        publicSentiment: sentimentDelta,
        trustScore: trustDelta,
        legalRisk,
        newsVelocity,
        timeRemainingSec: -20,
      },
      scoreDelta,
      coachingNote: parsed.coachingNote,
      suggestedNextAction: parsed.suggestedNextAction,
      updatedState: {
        ...nextStateWithoutReadiness,
        readinessScore: updatedReadiness,
      },
      updatedReadiness,
      mode: "live",
    };
  } catch (error) {
    console.warn("[evaluateEpisodeLive] fallback to mock:", error);
    return null;
  }
}

export async function createAfterActionLive(
  request: AfterActionRequest,
): Promise<AfterActionResponse | null> {
  const system =
    "You generate concise post-incident reports and communication artifacts. Output strictly valid JSON only.";

  const prompt = [
    "Generate an after-action report for this run.",
    `runId: ${request.runId}`,
    `finalState: ${JSON.stringify(request.finalState)}`,
    `runLog: ${JSON.stringify(request.runLog)}`,
    "Return JSON with:",
    "- aarMarkdown (must include sections: Timeline Snapshot, What Went Well, What Missed, Recommended Runbook)",
    "- artifacts with keys: holding_statement, reporter_email, support_script, internal_memo",
  ].join("\n");

  try {
    const parsed = await callAnthropicForJson({
      system,
      prompt,
      schema: afterActionOutputSchema,
    });

    return {
      runId: request.runId,
      aarMarkdown: parsed.aarMarkdown,
      artifacts: parsed.artifacts,
      mode: "live",
    };
  } catch (error) {
    console.warn("[createAfterActionLive] fallback to mock:", error);
    return null;
  }
}

export async function reporterRespondLive(
  request: ReporterRespondRequest,
): Promise<ReporterRespondResponse | null> {
  const playerTurns = request.conversationHistory.filter((turn) => turn.speaker === "player").length;
  const forceWrapUp = playerTurns >= 3;
  const forceContinue = playerTurns < 2;

  const system = [
    "You are role-playing a fictional journalist in a corporate crisis simulation.",
    "Stay in-character as the provided reporter persona.",
    "Use one concise follow-up question per turn.",
    "Keep pressure realistic but avoid defamation and avoid real people/politicians.",
    "The call should end naturally in 2-3 reporter responses total.",
  ].join(" ");

  const historyText =
    request.conversationHistory
      .map((turn, index) => `${index + 1}. ${turn.speaker.toUpperCase()}: ${turn.text}`)
      .join("\n") || "(empty)";

  const prompt = [
    "Generate the reporter's next reply as JSON.",
    `runId: ${request.runId}`,
    `persona: ${request.persona}`,
    `latestUserResponse: ${request.userResponse}`,
    `scenarioContext: ${JSON.stringify(request.scenarioContext ?? {})}`,
    `conversationHistory:\n${historyText}`,
    `playerTurnsSoFar: ${playerTurns}`,
    `mustEndNow: ${forceWrapUp}`,
    `mustContinueNow: ${forceContinue}`,
    "Output fields:",
    '- reporterReply: what the reporter says in transcript form (1-2 short sentences).',
    "- ttsText: speech-optimized version of reporterReply.",
    "- tone: one of neutral|pressing|skeptical|closing.",
    "- shouldContinue: boolean.",
    "Rules:",
    "- If mustEndNow=true then tone must be closing and shouldContinue=false.",
    "- If mustContinueNow=true then shouldContinue=true.",
    "- Keep under 320 characters for reporterReply.",
    "- Never include markdown or speaker labels in reply text.",
  ].join("\n");

  try {
    const parsed = await callAnthropicForJson({
      system,
      prompt,
      schema: reporterRespondOutputSchema,
    });

    const shouldContinue = forceWrapUp ? false : forceContinue ? true : parsed.shouldContinue;
    const tone = shouldContinue ? parsed.tone : "closing";

    return {
      reporterReply: parsed.reporterReply,
      ttsText: parsed.ttsText ?? parsed.reporterReply,
      tone,
      shouldContinue,
      mode: "live",
    };
  } catch (error) {
    console.warn("[reporterRespondLive] fallback to mock:", error);
    return null;
  }
}
