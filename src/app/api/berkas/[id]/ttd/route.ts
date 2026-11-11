import { NextResponse } from "next/server";
import { canValidateBerkas } from "@/lib/berkas/access";
import { uploadTtdSchema } from "@/lib/berkas/schema";
import { submitTtd } from "@/lib/berkas/service";
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

// Validator-scoped signature endpoint. The actor comes from the session; the
// body only carries the private Blob pathname. The service verifies that the
// actor is the assigned validator and that validator 1 signed before validator 2.
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    if (!canValidateBerkas(auth.actor.role)) {
      return NextResponse.json(
        { error: { message: "Anda tidak memiliki akses validasi Berkas" } },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = uploadTtdSchema.safeParse(parsedBody.body);
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
      const updated = await submitTtd(
        auth.actor,
        id,
        parsed.data.ttd.pathname,
        parsed.data.catatan ?? null,
      );
      return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/berkas/[id]/ttd failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menyimpan TTD." } },
      { status: 500 },
    );
  }
}
