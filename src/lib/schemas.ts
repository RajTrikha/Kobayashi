import { z } from "zod";

export const legalRiskSchema = z.enum(["low", "medium", "high"]);
export const newsVelocitySchema = z.enum(["falling", "steady", "rising"]);

export const runStateSchema = z
  .object({
    publicSentiment: z.number().int().min(0).max(100),
    trustScore: z.number().int().min(0).max(100),
    legalRisk: legalRiskSchema,
    newsVelocity: newsVelocitySchema,
    timeRemainingSec: z.number().int().min(0),
    readinessScore: z.number().int().min(0).max(100),
  })
  .strict();

export const feedItemSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    text: z.string().min(1),
    tone: z.enum(["neutral", "concerned", "critical"]),
  })
  .strict();

export const internalMessageSchema = z
  .object({
    id: z.string().min(1),
    from: z.string().min(1),
    text: z.string().min(1),
    channel: z.string().min(1),
    priority: z.enum(["low", "normal", "high"]),
  })
  .strict();

export const reporterCallSchema = z
  .object({
    transcript: z.string().min(1),
    ttsText: z.string().min(1),
    persona: z.string().min(1),
  })
  .strict();

export const episodeBeatSchema = z
  .object({
    id: z.string().min(1),
    atSec: z.number().int().min(0),
    feedItems: z.array(feedItemSchema),
    internalMessages: z.array(internalMessageSchema),
    call: reporterCallSchema.optional(),
  })
  .strict();

export const scoringRubricSchema = z
  .object({
    acknowledgment: z.number().min(0).max(1),
    clarity: z.number().min(0).max(1),
    actionability: z.number().min(0).max(1),
    escalation: z.number().min(0).max(1),
    legalSafety: z.number().min(0).max(1),
    empathy: z.number().min(0).max(1),
  })
  .strict();

export const constraintCardSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

export const episodeSchema = z
  .object({
    episodeId: z.string().min(1),
    title: z.string().min(1),
    role: z.string().min(1),
    org: z.string().min(1),
    objective: z.string().min(1),
    initialState: runStateSchema,
    beats: z.array(episodeBeatSchema).min(1),
    scoringRubric: scoringRubricSchema,
    constraints: z.array(constraintCardSchema),
  })
  .strict();

export const generateEpisodeRequestSchema = z
  .object({
    pack: z.literal("pr_meltdown"),
    role: z.string().min(1).max(100),
    org: z.string().min(1).max(120),
    seed: z.number().int().optional(),
  })
  .strict();

export const generateEpisodeResponseSchema = z
  .object({
    runId: z.string().min(1),
    episodeId: z.string().min(1),
    episode: episodeSchema,
    runState: runStateSchema,
    startedAt: z.string().datetime(),
    mode: z.enum(["mock", "live"]),
  })
  .strict();

export const evaluateContextSchema = z
  .object({
    recentFeed: z.array(feedItemSchema).max(50).optional(),
    recentInternalMessages: z.array(internalMessageSchema).max(50).optional(),
    note: z.string().max(300).optional(),
  })
  .strict();

export const evaluateEpisodeRequestSchema = z
  .object({
    runId: z.string().min(1),
    episodeId: z.string().min(1),
    runState: runStateSchema,
    action: z.string().min(1).max(220),
    context: evaluateContextSchema.optional(),
  })
  .strict();

export const stateDeltaSchema = z
  .object({
    publicSentiment: z.number().int().min(-10).max(10),
    trustScore: z.number().int().min(-10).max(10),
    legalRisk: legalRiskSchema.optional(),
    newsVelocity: newsVelocitySchema.optional(),
    timeRemainingSec: z.number().int().min(-60).max(0).optional(),
  })
  .strict();

export const evaluateEpisodeResponseSchema = z
  .object({
    stateDelta: stateDeltaSchema,
    scoreDelta: z.number().int().min(-10).max(10),
    coachingNote: z.string().min(1),
    suggestedNextAction: z.string().min(1).optional(),
    updatedState: runStateSchema,
    updatedReadiness: z.number().int().min(0).max(100),
    mode: z.enum(["mock", "live"]),
  })
  .strict();

export const runLogEventSchema = z
  .object({
    ts: z.string().datetime(),
    type: z.enum(["beat", "action", "evaluation", "system"]),
    message: z.string().min(1),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const afterActionRequestSchema = z
  .object({
    runId: z.string().min(1),
    runLog: z.array(runLogEventSchema).min(1),
    finalState: runStateSchema,
  })
  .strict();

export const afterActionArtifactsSchema = z
  .object({
    holding_statement: z.string().min(1),
    reporter_email: z.string().min(1),
    support_script: z.string().min(1),
    internal_memo: z.string().min(1),
  })
  .strict();

export const afterActionResponseSchema = z
  .object({
    runId: z.string().min(1),
    aarMarkdown: z.string().min(1),
    artifacts: afterActionArtifactsSchema,
    mode: z.enum(["mock", "live"]),
  })
  .strict();

export const ttsRequestSchema = z
  .object({
    text: z.string().min(1).max(2000),
    persona: z.string().min(1).max(80).optional(),
    voiceId: z.string().min(1).max(120).optional(),
  })
  .strict();

export const apiErrorSchema = z
  .object({
    error: z.string().min(1),
    details: z.unknown().optional(),
  })
  .strict();

export type RunState = z.infer<typeof runStateSchema>;
export type GenerateEpisodeRequest = z.infer<typeof generateEpisodeRequestSchema>;
export type GenerateEpisodeResponse = z.infer<typeof generateEpisodeResponseSchema>;
export type EvaluateEpisodeRequest = z.infer<typeof evaluateEpisodeRequestSchema>;
export type EvaluateEpisodeResponse = z.infer<typeof evaluateEpisodeResponseSchema>;
export type AfterActionRequest = z.infer<typeof afterActionRequestSchema>;
export type AfterActionResponse = z.infer<typeof afterActionResponseSchema>;
export type TtsRequest = z.infer<typeof ttsRequestSchema>;
