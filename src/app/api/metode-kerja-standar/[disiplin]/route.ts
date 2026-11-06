import { NextResponse } from "next/server";
import { getDisiplinBySlug } from "@/lib/metode-kerja-standar/constants";
import { getDisiplinDetail } from "@/lib/metode-kerja-standar/service";
import { badRequest, getActor, handleRouteError } from "../_helpers";

type RouteContext = { params: Promise<{ disiplin: string }> };

// GET /api/metode-kerja-standar/[disiplin]
// Returns sub-kategori + item + PIC + audit for one discipline slug.
export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { disiplin: slug } = await context.params;
    const disiplin = getDisiplinBySlug(slug);
    if (!disiplin) {
      return badRequest("Disiplin tidak valid");
    }

    const data = await getDisiplinDetail(actor, disiplin.code);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/metode-kerja-standar/[disiplin] failed");
  }
}
