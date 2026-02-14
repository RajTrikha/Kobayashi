import { NextResponse } from "next/server";

import { parseRequest } from "@/lib/api";
import { createMockTtsAudio } from "@/lib/mockData";
import { ttsRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, ttsRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const voiceId = parsed.data.voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? "mock_voice";
  const persona = parsed.data.persona ?? "Reporter";

  const audioBuffer = createMockTtsAudio({
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
      "X-Kobayashi-TTS-Mode": "mock",
    },
  });
}
