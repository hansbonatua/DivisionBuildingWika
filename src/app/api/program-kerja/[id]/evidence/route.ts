import { NextResponse } from "next/server";
import { updateProgramEvidence } from "@/lib/program-kerja/service";
import { updateProgramEvidenceSchema } from "@/lib/program-kerja/schema";
import { getActor, invalidIdResponse, isUuid, mapDomainError, parseJsonBody } from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();
    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;
    const parsed = updateProgramEvidenceSchema.safeParse(parsedBody.body);
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
      const updated = await updateProgramEvidence(auth.actor, id, parsed.data);
      return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/program-kerja/[id]/evidence failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
