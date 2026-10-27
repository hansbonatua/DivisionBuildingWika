import { NextResponse } from "next/server";
import { listProgramKerjaPicOptions } from "@/lib/program-kerja/service";
import { getActor, mapDomainError } from "../_helpers";

// Narrow PIC option feed for Program Kerja create/edit. Replaces the previous
// dependency on the broad GET /api/users directory: only eligible Head Office
// users are returned, projected to { id, name }.
export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const options = await listProgramKerjaPicOptions(auth.actor);
    return NextResponse.json({ data: options }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/program-kerja/pic-options failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
