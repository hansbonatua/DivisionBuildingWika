import { NextResponse } from "next/server";
import { getSummary } from "@/lib/project-documentation/service";
import { getActor, handleRouteError, parseYearQuery } from "../_helpers";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// GET /api/project-documentation/summary?year=YYYY
// Returns every Master Project with a twelve-month completeness matrix for the
// requested documentation year.
export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const year = parseYearQuery(request);
    const data = await getSummary(actor, year);
    return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/project-documentation/summary failed",
    );
  }
}
