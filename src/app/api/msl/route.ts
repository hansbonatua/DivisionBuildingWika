import { NextResponse } from "next/server";
import { getMslYearView } from "@/lib/msl/service";
import { getActor, mapDomainError, parseYearQuery } from "./_helpers";

// GET /api/msl?year=2026
// Year view for MSL Engineering: the selected year, the available years, the
// actor's manage capability, every Master Project of that year with its
// assessment (if any) and that year's annual note. Score/category are derived
// server-side. No assessments are created here.
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const parsedYear = parseYearQuery(new URL(request.url).searchParams.get("year"));
    if ("response" in parsedYear) return parsedYear.response;

    try {
      const view = await getMslYearView(auth.actor, parsedYear.year);
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
