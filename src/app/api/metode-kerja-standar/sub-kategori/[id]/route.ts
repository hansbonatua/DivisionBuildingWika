import { NextResponse } from "next/server";
import { updateSubKategoriSchema } from "@/lib/metode-kerja-standar/schema";
import {
  deleteSubKategori,
  updateSubKategori,
} from "@/lib/metode-kerja-standar/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/metode-kerja-standar/sub-kategori/[id]
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(request, updateSubKategoriSchema);
    const data = await updateSubKategori(actor, id, input);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/metode-kerja-standar/sub-kategori/[id] failed",
    );
  }
}

// DELETE /api/metode-kerja-standar/sub-kategori/[id]
// Admin-only. The service returns 409 while items still exist.
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const data = await deleteSubKategori(actor, id);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/metode-kerja-standar/sub-kategori/[id] failed",
    );
  }
}
