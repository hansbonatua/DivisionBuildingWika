import { NextResponse } from "next/server";
import { deleteBerkas } from "@/lib/berkas/service";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
} from "../_helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

// Admin-only hard delete. Authorization lives in the service; this route only
// authenticates, validates the id shape and maps domain errors.
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    try {
      const deleted = await deleteBerkas(auth.actor, id);
      return NextResponse.json(
        { data: { deleted: true, id: deleted.id } },
        { status: 200 },
      );
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("DELETE /api/berkas/[id] failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menghapus Berkas." } },
      { status: 500 },
    );
  }
}
