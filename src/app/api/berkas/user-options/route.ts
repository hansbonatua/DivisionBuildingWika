import { NextResponse } from "next/server";
import { listBerkasUserOptions } from "@/lib/berkas/service";
import { getActor, mapDomainError } from "../_helpers";

// GET /api/berkas/user-options
// Feed for the Validator 1 / Validator 2 dropdowns on the Ajukan form. Only
// users who may create Berkas can read it; the create service still re-checks
// that each selected user exists and is active.
export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const rows = await listBerkasUserOptions(auth.actor);
    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/berkas/user-options failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
