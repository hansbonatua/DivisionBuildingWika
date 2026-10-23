import { NextResponse } from "next/server";
import { listMasterProjectPicOptions } from "@/lib/master-project/service";
import { getActor, mapDomainError } from "../_helpers";

export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const options = await listMasterProjectPicOptions(auth.actor);
    return NextResponse.json({ data: options }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/master-project/pic-options failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
