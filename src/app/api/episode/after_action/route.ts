import { parseRequest, validationResponse } from "@/lib/api";
import { createMockAfterAction } from "@/lib/mockData";
import {
  afterActionRequestSchema,
  afterActionResponseSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = await parseRequest(request, afterActionRequestSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const responsePayload = createMockAfterAction(parsed.data);

  return validationResponse(afterActionResponseSchema, responsePayload);
}
