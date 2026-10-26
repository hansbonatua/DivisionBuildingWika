import { NextResponse } from "next/server";
import { listEngineeringDatabasePicOptions } from "@/lib/engineering-database/service";
import { getActor, mapDomainError } from "../_helpers";

// Eligible PIC roles: Admin, Head Office, Project. Management is excluded and
// options are not filtered by account status in V1.
export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const options = await listEngineeringDatabasePicOptions(auth.actor);
    return NextResponse.json({ data: options }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/engineering-database/pic-options failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
