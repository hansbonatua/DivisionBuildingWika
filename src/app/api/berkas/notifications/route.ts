import { NextResponse } from "next/server";
import { getBerkasNotificationCount } from "@/lib/berkas/service";
import { getActor, mapDomainError } from "../_helpers";

// Returns the authenticated user's actionable Berkas count:
// - validator slots currently waiting for that user's TTD
// - the user's own Berkas that were rejected and need revision
export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const needsAction = await getBerkasNotificationCount(auth.actor);
    return NextResponse.json(
      { needsAction },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/berkas/notifications failed", error);
    return NextResponse.json(
      { error: { message: "Gagal memuat notifikasi Berkas." } },
      { status: 500 },
    );
  }
}
