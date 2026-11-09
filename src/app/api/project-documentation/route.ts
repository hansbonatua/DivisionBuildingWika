import { NextResponse } from "next/server";
import { listDocumentations } from "@/lib/project-documentation/service";
import { getActor, handleRouteError, parsePeriodQuery } from "./_helpers";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// GET /api/project-documentation?year=YYYY&month=M
// Every Master Project is returned for the requested period, including
// projects without a documentation row.
export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const { year, month } = parsePeriodQuery(request);
    const data = await listDocumentations(actor, year, month);
    return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/project-documentation failed");
  }
}
