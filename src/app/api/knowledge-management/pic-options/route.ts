import { NextResponse } from "next/server";
import { listKnowledgePicOptions } from "@/lib/knowledge-management/service";
import { getActor, mapDomainError } from "../_helpers";

// GET /api/knowledge-management/pic-options
// Narrow PIC feed for the knowledge table: Head Office users only, every account
// status included (V1 rule). Returns id, name, status and position so the UI can
// show suspended assignees explicitly.
export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const options = await listKnowledgePicOptions(auth.actor);
    return NextResponse.json({ data: options }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/knowledge-management/pic-options failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
