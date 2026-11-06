import { NextResponse } from "next/server";
import { createItemSchema } from "@/lib/metode-kerja-standar/schema";
import { createItem } from "@/lib/metode-kerja-standar/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
} from "../../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/metode-kerja-standar/sub-kategori/[id]/item
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(request, createItemSchema);
    const data = await createItem(actor, id, input);
    return NextResponse.json(
      { data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/metode-kerja-standar/sub-kategori/[id]/item failed",
    );
  }
}
