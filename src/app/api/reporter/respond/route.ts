import { parseRequest, validationResponse } from "@/lib/api";
import { isAnthropicConfigured } from "@/lib/config";
import { createMockReporterReply } from "@/lib/mockData";
import { reporterRespondLive } from "@/lib/providers/anthropic";
import {
  reporterRespondRequestSchema,
  reporterRespondResponseSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, reporterRespondRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const livePayload = isAnthropicConfigured() ? await reporterRespondLive(parsed.data) : null;
  const responsePayload = livePayload ?? createMockReporterReply(parsed.data);

  return validationResponse(reporterRespondResponseSchema, responsePayload);
}
