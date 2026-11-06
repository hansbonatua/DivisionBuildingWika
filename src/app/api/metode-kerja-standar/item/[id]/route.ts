import { NextResponse } from "next/server";
import { updateItemSchema } from "@/lib/metode-kerja-standar/schema";
import { deleteItem, updateItem } from "@/lib/metode-kerja-standar/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/metode-kerja-standar/item/[id]
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(request, updateItemSchema);
    const data = await updateItem(actor, id, input);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "PUT /api/metode-kerja-standar/item/[id] failed");
  }
}

// DELETE /api/metode-kerja-standar/item/[id]
// Admin-only; PIC assignments cascade through the database FK.
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const data = await deleteItem(actor, id);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/metode-kerja-standar/item/[id] failed",
    );
  }
}
