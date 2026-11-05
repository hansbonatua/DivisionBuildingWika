import { NextResponse } from "next/server";
import {
  deleteKnowledgeEvidenceById,
  updateKnowledgeEvidenceById,
} from "@/lib/knowledge-management/service";
import { evidencePayloadSchema } from "@/lib/knowledge-management/schema";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
  parseJsonBody,
} from "@/app/api/knowledge-management/_helpers";

// PATCH /api/knowledge-management/evidence/[id]
// Edits ONE evidence row. Content and PIC are untouched.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse("ID evidence tidak valid");

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = evidencePayloadSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Evidence tidak valid",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const updated = await updateKnowledgeEvidenceById(auth.actor, id, parsed.data);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("PATCH /api/knowledge-management evidence failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

// DELETE /api/knowledge-management/evidence/[id]
// Removes ONE evidence row. Whole-record deletion stays disabled (KM-02).
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse("ID evidence tidak valid");

    const result = await deleteKnowledgeEvidenceById(auth.actor, id);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("DELETE /api/knowledge-management evidence failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
