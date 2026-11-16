import { NextResponse } from "next/server";
import { createDocumentSchema } from "@/lib/regulation/schema";
import { createRegulationDocument } from "@/lib/regulation/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
} from "../../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/regulation/sub-kategori/[id]/document
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(request, createDocumentSchema);
    const data = await createRegulationDocument(actor, id, input);
    return NextResponse.json(
      { data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/regulation/sub-kategori/[id]/document failed",
    );
  }
}
