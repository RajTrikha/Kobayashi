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
  type RunState,
} from "@/lib/schemas";
import { deriveReadinessScore } from "@/lib/mockData";

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
  const outputSchema = z.object({ episode: episodeSchema }).strict();

  const system =
    "You design deterministic corporate crisis simulation episodes for judge demos. Keep company and media fictional and non-political.";

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
    "Return shape: { \"episode\": <episodeSchema object> }",
  ].join("\n");

  try {
    const parsed = await callAnthropicForJson({
      system,
      prompt,
      schema: outputSchema,
    });

    return {
      runId: `run_${nanoid(10)}`,
      episodeId: parsed.episode.episodeId,
      episode: {
        ...parsed.episode,
        role: request.role,
        org: request.org,
      },
      runState: parsed.episode.initialState,
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
