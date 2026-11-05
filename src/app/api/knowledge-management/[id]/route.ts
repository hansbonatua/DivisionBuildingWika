import { NextResponse } from "next/server";
import {
  deleteKnowledgeEntry,
  getKnowledgeEntry,
  updateKnowledgeEntry,
} from "@/lib/knowledge-management/service";
import { updateKnowledgeEntrySchema } from "@/lib/knowledge-management/schema";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
  parseExpectedVersion,
  parseJsonBody,
  validationErrorResponse,
} from "../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

function readExpectedVersion(body: unknown): unknown {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  return (body as Record<string, unknown>).expected_version;
}

// GET /api/knowledge-management/[id]
// Returns one complete record DTO.
export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const item = await getKnowledgeEntry(auth.actor, id);
    return NextResponse.json({ data: item }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/knowledge-management/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

// PUT /api/knowledge-management/[id]
// Updates content, PIC list and the single evidence inside one transaction.
// project_id/projectId are rejected by the strict schema.
export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const expectedVersion = parseExpectedVersion(
      readExpectedVersion(parsedBody.body),
    );

    const parsed = updateKnowledgeEntrySchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const updated = await updateKnowledgeEntry(auth.actor, id, {
      ...parsed.data,
      expected_version: expectedVersion,
    });
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("PUT /api/knowledge-management/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

// DELETE /api/knowledge-management/[id]?expected_version=N
// Permanent delete of the record; PIC/evidence cascade, the Master Project is
// never touched, and the migration archive is not removed.
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const expectedVersion = parseExpectedVersion(
      new URL(request.url).searchParams.get("expected_version"),
    );

    const result = await deleteKnowledgeEntry(auth.actor, id, expectedVersion);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("DELETE /api/knowledge-management/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
