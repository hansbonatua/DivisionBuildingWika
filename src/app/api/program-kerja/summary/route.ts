import { NextResponse } from "next/server";
import { getProgramKerjaSummary } from "@/lib/program-kerja/summaryService";
import { programKerjaSummaryQuerySchema } from "@/lib/program-kerja/schema";
import { getActor, mapDomainError } from "../_helpers";

// Read-only Summary Report V1 endpoint. Only GET exists by design.
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const params = new URL(request.url).searchParams;
    const optional = (key: string): string | undefined => {
      const value = params.get(key);
      return value === null || value.trim() === "" ? undefined : value;
    };

    const parsed = programKerjaSummaryQuerySchema.safeParse({
      year: optional("year"),
      groupId: optional("groupId"),
      unit: optional("unit"),
      picId: optional("picId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi query gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const summary = await getProgramKerjaSummary(auth.actor, parsed.data);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/program-kerja/summary failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
