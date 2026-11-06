import { NextResponse } from "next/server";
import { listPicOptions } from "@/lib/metode-kerja-standar/service";
import { getActor, handleRouteError } from "../_helpers";

// GET /api/metode-kerja-standar/pic-options
// Head Office users, including suspended users (status is returned for UI).
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
      "GET /api/metode-kerja-standar/pic-options failed",
    );
  }
}
