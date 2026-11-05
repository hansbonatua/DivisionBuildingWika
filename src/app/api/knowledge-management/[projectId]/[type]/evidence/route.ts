import { NextResponse } from "next/server";
import { addKnowledgeEvidence } from "@/lib/knowledge-management/service";
import {
  evidencePayloadSchema,
  isKnowledgeType,
} from "@/lib/knowledge-management/schema";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
  parseJsonBody,
} from "@/app/api/knowledge-management/_helpers";

// POST /api/knowledge-management/[projectId]/[type]/evidence
// Adds ONE evidence row to an existing record. Content and PIC are untouched.
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; type: string }> },
) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { projectId, type } = await context.params;
    if (!isUuid(projectId)) return invalidIdResponse("Project tidak valid");
    if (!isKnowledgeType(type)) return invalidIdResponse("Tipe knowledge tidak valid");

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

    const created = await addKnowledgeEvidence(auth.actor, projectId, type, parsed.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("POST /api/knowledge-management evidence failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
