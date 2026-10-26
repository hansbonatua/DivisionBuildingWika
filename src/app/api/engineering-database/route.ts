import { NextResponse } from "next/server";
import {
  createEngineeringDatabaseEntrySchema,
  engineeringDatabaseListQuerySchema,
} from "@/lib/engineering-database/schema";
import {
  createEngineeringDatabaseEntry,
  listEngineeringDatabaseEntries,
} from "@/lib/engineering-database/service";
import { getActor, mapDomainError, parseJsonBody } from "./_helpers";

// GET /api/engineering-database?category=<CATEGORY>&q=<keyword>
// Every listing is category-scoped; a missing or unknown category is a client
// error rather than an implicit "all categories" response. `q` optionally
// searches the Master Project name/location server-side.
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const queryParams = new URL(request.url).searchParams;
    const parsed = engineeringDatabaseListQuerySchema.safeParse({
      category: queryParams.get("category") ?? undefined,
      q: queryParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Kategori tidak valid",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const items = await listEngineeringDatabaseEntries(
      auth.actor,
      parsed.data.category,
      parsed.data.q,
    );
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/engineering-database failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;
    const parsed = createEngineeringDatabaseEntrySchema.safeParse(
      parsedBody.body,
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }
    try {
      const created = await createEngineeringDatabaseEntry(
        auth.actor,
        parsed.data,
      );
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/engineering-database failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
