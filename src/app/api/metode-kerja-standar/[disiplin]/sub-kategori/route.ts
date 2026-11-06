import { NextResponse } from "next/server";
import { getDisiplinBySlug } from "@/lib/metode-kerja-standar/constants";
import { createSubKategoriSchema } from "@/lib/metode-kerja-standar/schema";
import { createSubKategori } from "@/lib/metode-kerja-standar/service";
import {
  badRequest,
  getActor,
  handleRouteError,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ disiplin: string }> };

// POST /api/metode-kerja-standar/[disiplin]/sub-kategori
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { disiplin: slug } = await context.params;
    const disiplin = getDisiplinBySlug(slug);
    if (!disiplin) {
      return badRequest("Disiplin tidak valid");
    }

    const input = await parseJsonBody(request, createSubKategoriSchema);
    const data = await createSubKategori(actor, disiplin.code, input);
    return NextResponse.json(
      { data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/metode-kerja-standar/[disiplin]/sub-kategori failed",
    );
  }
}
