import { NextResponse } from "next/server";
import { getSummary } from "@/lib/metode-kerja-standar/service";
import { getActor, handleRouteError } from "../_helpers";

// GET /api/metode-kerja-standar/summary
// All six disciplines are represented, including empty rows.
export async function GET() {
  try {
    const actor = await getActor();
    const data = await getSummary(actor);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/metode-kerja-standar/summary failed");
  }
}
