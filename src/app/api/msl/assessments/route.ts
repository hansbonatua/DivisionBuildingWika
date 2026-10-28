import { NextResponse } from "next/server";
import { createMslAssessmentSchema } from "@/lib/msl/schema";
import { createMslAssessment } from "@/lib/msl/service";
import { getActor, mapDomainError, parseJsonBody } from "../_helpers";

// POST /api/msl/assessments
// Creates the single assessment of a Master Project. The payload carries only
// the project and the three components (+ optional remarks): `year`, `score`
// and `category` are server-owned and rejected by the strict schema.
export async function POST(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = createMslAssessmentSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    try {
      const created = await createMslAssessment(auth.actor, parsed.data);
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/msl/assessments failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
