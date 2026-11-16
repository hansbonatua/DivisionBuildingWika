import { NextResponse } from "next/server";
import { updateDocumentSchema } from "@/lib/regulation/schema";
import {
  deleteRegulationDocument,
  updateRegulationDocument,
} from "@/lib/regulation/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/regulation/document/[id]
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(request, updateDocumentSchema);
    const data = await updateRegulationDocument(actor, id, input);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/regulation/document/[id] failed",
    );
  }
}

// DELETE /api/regulation/document/[id]
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const data = await deleteRegulationDocument(actor, id);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/regulation/document/[id] failed",
    );
  }
}
