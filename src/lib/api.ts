import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

export async function parseRequest<T>(request: Request, schema: ZodType<T>) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "INVALID_JSON",
          details: error instanceof Error ? error.message : "Unable to parse JSON body",
        },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: z.treeifyError(parsed.error),
        },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true as const,
    data: parsed.data,
  };
}

export function validationResponse<T>(schema: ZodType<T>, payload: unknown) {
  const validated = schema.safeParse(payload);

  if (!validated.success) {
    return NextResponse.json(
      {
        error: "RESPONSE_VALIDATION_ERROR",
        details: z.treeifyError(validated.error),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(validated.data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
