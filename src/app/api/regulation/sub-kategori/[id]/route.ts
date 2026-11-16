import { NextResponse } from "next/server";
import { updateSubKategoriSchema } from "@/lib/regulation/schema";
import {
  deleteRegulationSubKategori,
  updateRegulationSubKategori,
} from "@/lib/regulation/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/regulation/sub-kategori/[id]
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(request, updateSubKategoriSchema);
    const data = await updateRegulationSubKategori(actor, id, input);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/regulation/sub-kategori/[id] failed",
    );
  }
}

// DELETE /api/regulation/sub-kategori/[id]
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const data = await deleteRegulationSubKategori(actor, id);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/regulation/sub-kategori/[id] failed",
    );
  }
}
