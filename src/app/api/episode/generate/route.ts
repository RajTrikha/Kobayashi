import { parseRequest, validationResponse } from "@/lib/api";
import { isAnthropicConfigured } from "@/lib/config";
import { createMockEpisode } from "@/lib/mockData";
import { generateEpisodeLive } from "@/lib/providers/anthropic";
import {
  generateEpisodeRequestSchema,
  generateEpisodeResponseSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, generateEpisodeRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const livePayload = isAnthropicConfigured() ? await generateEpisodeLive(parsed.data) : null;
  const responsePayload = livePayload ?? createMockEpisode(parsed.data);

  return validationResponse(generateEpisodeResponseSchema, responsePayload);
}
