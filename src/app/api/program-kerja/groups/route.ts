import { NextResponse } from "next/server";
import { listProgramKerjaGroups } from "@/lib/program-kerja/service";
import { getActor, mapDomainError } from "../_helpers";

export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const groups = await listProgramKerjaGroups(auth.actor);
    return NextResponse.json({ data: groups }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/program-kerja/groups failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
