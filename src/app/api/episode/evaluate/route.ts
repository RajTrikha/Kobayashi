import { parseRequest, validationResponse } from "@/lib/api";
import { evaluateMockAction } from "@/lib/mockData";
import {
  evaluateEpisodeRequestSchema,
  evaluateEpisodeResponseSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, evaluateEpisodeRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const responsePayload = evaluateMockAction(parsed.data);

  return validationResponse(evaluateEpisodeResponseSchema, responsePayload);
}
