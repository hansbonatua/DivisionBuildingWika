import { NextResponse } from "next/server";
import { getBerkasFile } from "@/lib/berkas/service";
import { contentDispositionInline } from "@/lib/storage/blob";
import { getActor, invalidIdResponse, isUuid, mapDomainError } from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// Authenticated private preview proxy. The record id is the only selector
// accepted from the client; the storage pathname is resolved server-side.
// This route streams the ORIGINAL PDF (no cover), as specified for the viewer.

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    try {
      const file = await getBerkasFile(auth.actor, id);
      return new Response(file.stream, {
        status: 200,
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": contentDispositionInline(file.fileName),
          "Content-Length": String(file.size),
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
    console.error("GET /api/berkas/[id]/view failed", error);
    return NextResponse.json(
      { error: { message: "Gagal mengambil file PDF." } },
      { status: 500 },
    );
  }
}
