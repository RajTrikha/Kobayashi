import { z } from "zod";

const envSchema = z
  .object({
    ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
    ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-3-5-haiku-latest"),
    ELEVENLABS_API_KEY: z.string().trim().min(1).optional(),
    ELEVENLABS_VOICE_ID: z.string().trim().min(1).optional(),
  })
  .strict();

export type RuntimeEnv = z.infer<typeof envSchema>;

export function getRuntimeEnv(): RuntimeEnv {
  const parsed = envSchema.safeParse({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
  });

  if (!parsed.success) {
    return {
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: "claude-3-5-haiku-latest",
      ELEVENLABS_API_KEY: undefined,
      ELEVENLABS_VOICE_ID: undefined,
    };
  }

  return parsed.data;
}

export function isAnthropicConfigured(env = getRuntimeEnv()): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export function isElevenLabsConfigured(env = getRuntimeEnv(), voiceId?: string): boolean {
  return Boolean(env.ELEVENLABS_API_KEY && (voiceId ?? env.ELEVENLABS_VOICE_ID));
}
