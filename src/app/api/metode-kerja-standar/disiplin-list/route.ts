import { NextResponse } from "next/server";
import { listDisiplin } from "@/lib/metode-kerja-standar/service";
import { getActor, handleRouteError } from "../_helpers";

// GET /api/metode-kerja-standar/disiplin-list
// Metadata for the six hardcoded disciplines, including counts.
export async function GET() {
  try {
    const actor = await getActor();
    const data = await listDisiplin(actor);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/metode-kerja-standar/disiplin-list failed");
  }
}
