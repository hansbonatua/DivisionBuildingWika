import { NextResponse } from "next/server";
import { getMslYearView } from "@/lib/msl/service";
import { getActor, mapDomainError, parseMonthQuery, parseYearQuery } from "./_helpers";

// GET /api/msl?year=2026&month=3
// Period view for MSL Engineering: the selected year + month, the available
// years, the actor's manage capability, every Master Project of that year with
// its assessment for that MONTH (if any) and that year's annual note.
// Score/category are derived server-side. No assessments are created here.
//
// Defaults: year = current server year when it has Master Projects (otherwise
// the newest year that does), month = current server month. Months are fully
// independent — a month with no data returns unassessed rows, not an error.
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const searchParams = new URL(request.url).searchParams;

    const parsedYear = parseYearQuery(searchParams.get("year"));
    if ("response" in parsedYear) return parsedYear.response;

    const parsedMonth = parseMonthQuery(searchParams.get("month"));
    if ("response" in parsedMonth) return parsedMonth.response;

    try {
      const view = await getMslYearView(auth.actor, parsedYear.year, parsedMonth.month);
      return NextResponse.json({ data: view }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("GET /api/msl failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
