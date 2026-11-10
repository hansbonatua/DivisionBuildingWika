import { NextResponse } from "next/server";
import { downloadBerkas } from "@/lib/berkas/service";
import { contentDispositionAttachment } from "@/lib/storage/blob";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
} from "../../_helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

// Authenticated download proxy. Only a completed Berkas can be downloaded; the
// generated PDF is loaded from private storage, watermarked with the NIP from
// the session, and returned as an attachment. NIP is never accepted from the
// request body or query string.
export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    try {
      const file = await downloadBerkas(auth.actor, id);
      return new Response(new Uint8Array(file.bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": contentDispositionAttachment(file.fileName),
          "Content-Length": String(file.bytes.byteLength),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("GET /api/berkas/[id]/download failed", error);
    return NextResponse.json(
      { error: { message: "Gagal mengunduh file PDF." } },
      { status: 500 },
    );
  }
}
