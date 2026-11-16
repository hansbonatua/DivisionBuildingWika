import { NextResponse } from "next/server";
import { reorderSchema } from "@/lib/regulation/schema";
import { reorderRegulation } from "@/lib/regulation/service";
import {
  getActor,
  handleRouteError,
  parseJsonBody,
} from "../_helpers";

// POST /api/regulation/reorder
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(request, reorderSchema);
    const data = await reorderRegulation(actor, input);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/regulation/reorder failed",
    );
  }
}
