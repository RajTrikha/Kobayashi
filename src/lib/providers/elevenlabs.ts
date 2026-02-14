import { getRuntimeEnv } from "@/lib/config";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const REQUEST_TIMEOUT_MS = 15_000;

export async function synthesizeWithElevenLabs(input: {
  text: string;
  voiceId: string;
}): Promise<Buffer | null> {
  const env = getRuntimeEnv();
  if (!env.ELEVENLABS_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/${encodeURIComponent(input.voiceId)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "audio/mpeg",
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: input.text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`ElevenLabs request failed (${response.status}): ${details.slice(0, 220)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn("[synthesizeWithElevenLabs] fallback to mock:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
