import { NextResponse } from "next/server";
import { getRegulationDisiplinBySlug } from "@/lib/regulation/constants";
import { getRegulationDisiplinDetail } from "@/lib/regulation/service";
import { badRequest, getActor, handleRouteError } from "../_helpers";

type RouteContext = { params: Promise<{ disiplin: string }> };

// GET /api/regulation/[disiplin]
export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { disiplin: slug } = await context.params;
    const disiplin = getRegulationDisiplinBySlug(slug);
    if (!disiplin) {
      return badRequest("Disiplin Regulation tidak valid");
    }

    const data = await getRegulationDisiplinDetail(actor, disiplin.key);
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/regulation/[disiplin] failed",
    );
  }
}
