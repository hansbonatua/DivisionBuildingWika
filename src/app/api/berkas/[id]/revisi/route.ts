import { NextResponse } from "next/server";
import { revisiBerkasSchema } from "@/lib/berkas/schema";
import { revisiBerkas } from "@/lib/berkas/service";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
  parseJsonBody,
} from "../../_helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

// Pemohon (or Admin) replaces the original PDF of a rejected Berkas. The new
// bytes are already in private Blob storage; the service verifies them, counts
// pages server-side, resets both validator signatures and returns to TTD 1.
export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = revisiBerkasSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    try {
      const updated = await revisiBerkas(auth.actor, id, parsed.data);
      return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("PUT /api/berkas/[id]/revisi failed", error);
    return NextResponse.json(
      { error: { message: "Gagal merevisi Berkas." } },
      { status: 500 },
    );
  }
}
