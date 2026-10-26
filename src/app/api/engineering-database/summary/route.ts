import { NextResponse } from "next/server";
import { getEngineeringDatabaseSummary } from "@/lib/engineering-database/service";
import { getActor, mapDomainError } from "../_helpers";

// GET /api/engineering-database/summary
// Presence matrix for ALL Master Projects (zero-record projects included).
// V1 reports presence only: no counts, percentages, weights or approval state.
export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const summary = await getEngineeringDatabaseSummary(auth.actor);
    return NextResponse.json({ data: summary }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/engineering-database/summary failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
