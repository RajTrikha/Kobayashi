import { parseRequest, validationResponse } from "@/lib/api";
import { isAnthropicConfigured } from "@/lib/config";
import { evaluateMockAction } from "@/lib/mockData";
import { evaluateEpisodeLive } from "@/lib/providers/anthropic";
import {
  evaluateEpisodeRequestSchema,
  evaluateEpisodeResponseSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, evaluateEpisodeRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const livePayload = isAnthropicConfigured() ? await evaluateEpisodeLive(parsed.data) : null;
  const responsePayload = livePayload ?? evaluateMockAction(parsed.data);

  return validationResponse(evaluateEpisodeResponseSchema, responsePayload);
}
