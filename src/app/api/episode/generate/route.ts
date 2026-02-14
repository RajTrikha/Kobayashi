import { parseRequest, validationResponse } from "@/lib/api";
import { createMockEpisode } from "@/lib/mockData";
import {
  generateEpisodeRequestSchema,
  generateEpisodeResponseSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, generateEpisodeRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const responsePayload = createMockEpisode(parsed.data);

  return validationResponse(generateEpisodeResponseSchema, responsePayload);
}
