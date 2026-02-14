import { parseRequest, validationResponse } from "@/lib/api";
import { isAnthropicConfigured } from "@/lib/config";
import { createMockAfterAction } from "@/lib/mockData";
import { createAfterActionLive } from "@/lib/providers/anthropic";
import {
  afterActionRequestSchema,
  afterActionResponseSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, afterActionRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const livePayload = isAnthropicConfigured() ? await createAfterActionLive(parsed.data) : null;
  const responsePayload = livePayload ?? createMockAfterAction(parsed.data);

  return validationResponse(afterActionResponseSchema, responsePayload);
}
