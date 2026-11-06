import { NextResponse } from "next/server";
import { reorderSchema } from "@/lib/metode-kerja-standar/schema";
import { reorder } from "@/lib/metode-kerja-standar/service";
import { getActor, handleRouteError, parseJsonBody } from "../_helpers";

// POST /api/metode-kerja-standar/reorder
// Validates the complete child list inside the service transaction.
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(request, reorderSchema);
    const data = await reorder(actor, input);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/metode-kerja-standar/reorder failed");
  }
}
