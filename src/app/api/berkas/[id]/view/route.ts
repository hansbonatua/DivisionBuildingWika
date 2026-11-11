import { NextResponse } from "next/server";
import {
  getBerkasFile,
  getWatermarkedGeneratedPdf,
} from "@/lib/berkas/service";
import { contentDispositionInline } from "@/lib/storage/blob";
import { getActor, invalidIdResponse, isUuid, mapDomainError } from "../../_helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

// Authenticated private preview proxy. The record id is the only selector
// accepted from the client; the storage pathname is resolved server-side.
// Default is the ORIGINAL PDF (no cover); type=generated serves the completed
// final PDF with the same NIP watermark used by the download endpoint.

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const type = new URL(request.url).searchParams.get("type");

    try {
      if (type === "generated") {
        const file = await getWatermarkedGeneratedPdf(auth.actor, id);
        return new Response(new Uint8Array(file.bytes), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": contentDispositionInline(file.fileName),
            "Content-Length": String(file.bytes.byteLength),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
          },
        });
      }

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
