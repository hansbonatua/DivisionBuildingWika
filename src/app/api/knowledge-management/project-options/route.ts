import { NextResponse } from "next/server";
import { listKnowledgeProjectOptions } from "@/lib/knowledge-management/service";
import { getActor, mapDomainError } from "../_helpers";

// GET /api/knowledge-management/project-options?q=<term>
// Manage-only picker over Master Projects. Search is optional; the repository
// applies a SQL-level limit of 50 rows.
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    const options = await listKnowledgeProjectOptions(auth.actor, q);
    return NextResponse.json({ data: options }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/knowledge-management/project-options failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
