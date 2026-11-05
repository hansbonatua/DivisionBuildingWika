import { NextResponse } from "next/server";
import { upsertKnowledgeEntry } from "@/lib/knowledge-management/service";
import { isKnowledgeType, upsertKnowledgeEntrySchema } from "@/lib/knowledge-management/schema";
import { getActor, invalidIdResponse, isUuid, mapDomainError, parseJsonBody } from "../../_helpers";

type RouteContext = { params: Promise<{ projectId: string; type: string }> };

// PUT /api/knowledge-management/[projectId]/[type]
// Upsert of the single record for (project, submenu). The body carries the full
// desired state: content, the complete evidence list and the complete PIC list.
export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { projectId, type } = await context.params;
    if (!isUuid(projectId)) return invalidIdResponse("Project ID tidak valid");
    if (!isKnowledgeType(type)) {
      return NextResponse.json(
        { error: { message: "Tipe knowledge tidak valid" } },
        { status: 400 },
      );
    }

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = upsertKnowledgeEntrySchema.safeParse({
      ...(typeof parsedBody.body === "object" && parsedBody.body !== null
        ? parsedBody.body
        : {}),
      projectId,
      knowledgeType: type,
    });
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
      const result = await upsertKnowledgeEntry(auth.actor, parsed.data);
      return NextResponse.json({ data: result }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("PUT /api/knowledge-management/[projectId]/[type] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
