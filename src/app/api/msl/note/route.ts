import { NextResponse } from "next/server";
import { mslYearNoteSchema } from "@/lib/msl/schema";
import { saveMslYearNote } from "@/lib/msl/service";
import { getActor, mapDomainError, parseJsonBody } from "../_helpers";

// PUT /api/msl/note
// Upsert of the single annual note of a year: created when absent, updated when
// present (never a second row). A blank/whitespace note is normalized to NULL by
// the schema, so "belum pernah ditulis" keeps one representation.
export async function PUT(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = mslYearNoteSchema.safeParse(parsedBody.body);
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
      const saved = await saveMslYearNote(auth.actor, parsed.data);
      return NextResponse.json({ data: saved }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("PUT /api/msl/note failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
