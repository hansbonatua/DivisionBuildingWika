import { NextResponse } from "next/server";
import { engineeringDatabaseProjectOptionsQuerySchema } from "@/lib/engineering-database/schema";
import { listEngineeringDatabaseProjectOptions } from "@/lib/engineering-database/service";
import { getActor, mapDomainError } from "../_helpers";

// GET /api/engineering-database/project-options?q=<term>
// Narrow picker feed over the canonical master_projects table: returns only
// { id, name, location }, capped at 50 rows at SQL level. Deliberately NOT the
// broad /api/master-project list (that response carries PIC and timestamps and
// has no result cap).
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    const parsed = engineeringDatabaseProjectOptionsQuerySchema.safeParse({ q });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Parameter pencarian tidak valid",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const options = await listEngineeringDatabaseProjectOptions(
      auth.actor,
      parsed.data.q,
    );
    return NextResponse.json({ data: options }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error(
      "GET /api/engineering-database/project-options failed",
      error,
    );
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
