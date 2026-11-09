import { NextResponse } from "next/server";
import { updateCalculationSheetTemplateSchema } from "@/lib/calculation-sheet-template/schema";
import {
  deleteTemplateById,
  updateTemplateById,
} from "@/lib/calculation-sheet-template/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
} from "../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

const NO_STORE = { "Cache-Control": "no-store" } as const;

// PUT /api/calculation-sheet-template/[id]
// Kategori is immutable and rejected by the strict schema; kode/nama/pic/URL/
// catatan replace the stored values.
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(request, updateCalculationSheetTemplateSchema);
    const data = await updateTemplateById(actor, id, input);
    return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/calculation-sheet-template/[id] failed",
    );
  }
}

// DELETE /api/calculation-sheet-template/[id]
// Head Office has full CRUD (unlike MKS), so MANAGE is sufficient.
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const data = await deleteTemplateById(actor, id);
    return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/calculation-sheet-template/[id] failed",
    );
  }
}
