import { NextResponse } from "next/server";
import { rejectBerkasSchema } from "@/lib/berkas/schema";
import { rejectBerkas } from "@/lib/berkas/service";
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

// Record-scoped rejection. Admin may reject any waiting Berkas; a validator
// must hold BERKAS_VALIDATE and own the currently pending signature slot.
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = rejectBerkasSchema.safeParse(parsedBody.body);
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
      const updated = await rejectBerkas(auth.actor, id, parsed.data);
      return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/berkas/[id]/reject failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menolak Berkas." } },
      { status: 500 },
    );
  }
}
