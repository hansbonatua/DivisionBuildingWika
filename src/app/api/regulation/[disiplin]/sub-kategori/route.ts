import { NextResponse } from "next/server";
import { getRegulationDisiplinBySlug } from "@/lib/regulation/constants";
import { createSubKategoriSchema } from "@/lib/regulation/schema";
import { createRegulationSubKategori } from "@/lib/regulation/service";
import {
  badRequest,
  getActor,
  handleRouteError,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ disiplin: string }> };

// POST /api/regulation/[disiplin]/sub-kategori
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { disiplin: slug } = await context.params;
    const disiplin = getRegulationDisiplinBySlug(slug);
    if (!disiplin) {
      return badRequest("Disiplin Regulation tidak valid");
    }

    const input = await parseJsonBody(request, createSubKategoriSchema);
    const data = await createRegulationSubKategori(
      actor,
      disiplin.key,
      input,
    );
    return NextResponse.json(
      { data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/regulation/[disiplin]/sub-kategori failed",
    );
  }
}
