import { NextResponse } from "next/server";

import { parseRequest } from "@/lib/api";
import { getRuntimeEnv, isElevenLabsConfigured } from "@/lib/config";
import { createMockTtsAudio } from "@/lib/mockData";
import { synthesizeWithElevenLabs } from "@/lib/providers/elevenlabs";
import { ttsRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, ttsRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const env = getRuntimeEnv();
  const voiceId = parsed.data.voiceId ?? env.ELEVENLABS_VOICE_ID ?? "mock_voice";
  const persona = parsed.data.persona ?? "Reporter";

  const liveAudioBuffer = isElevenLabsConfigured(env, voiceId)
    ? await synthesizeWithElevenLabs({
        text: parsed.data.text,
        voiceId,
      })
    : null;

  const mode = liveAudioBuffer ? "live" : "mock";
  const audioBuffer =
    liveAudioBuffer ??
    createMockTtsAudio({
      text: parsed.data.text,
      voiceId,
      persona,
    });

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": `${audioBuffer.byteLength}`,
      "Cache-Control": "no-store",
      "X-Kobayashi-TTS-Mode": mode,
    },
  });
}
