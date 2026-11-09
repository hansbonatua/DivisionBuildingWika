import { NextResponse } from "next/server";
import { listPicOptions } from "@/lib/calculation-sheet-template/service";
import { getActor, handleRouteError } from "../_helpers";

// GET /api/calculation-sheet-template/pic-options
// Head Office users, including suspended users (status is returned so the UI can
// append "(non-aktif)"). Only roles that may edit need this list.
export async function GET() {
  try {
    const actor = await getActor();
    const data = await listPicOptions(actor);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/calculation-sheet-template/pic-options failed",
    );
  }
}
