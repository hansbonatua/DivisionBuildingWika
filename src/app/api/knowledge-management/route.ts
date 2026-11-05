import { NextResponse } from "next/server";
import { listKnowledgeProjectRows } from "@/lib/knowledge-management/service";
import { knowledgeTypeQuerySchema } from "@/lib/knowledge-management/schema";
import { getActor, mapDomainError } from "./_helpers";

// GET /api/knowledge-management?type=lesson_learn|best_practice|va_ve
// Returns every Master Project (LEFT JOIN), so the table always lists the full
// project directory even when no knowledge has been recorded yet.
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const parsed = knowledgeTypeQuerySchema.safeParse({
      type: new URL(request.url).searchParams.get("type") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Tipe knowledge tidak valid",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const rows = await listKnowledgeProjectRows(auth.actor, parsed.data.type);
    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/knowledge-management failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
