import { NextResponse } from "next/server";
import { updateProjectDocumentationSchema } from "@/lib/project-documentation/schema";
import { updateDocumentation } from "@/lib/project-documentation/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  parseJsonBody,
  parsePeriodPath,
} from "../../../_helpers";

type RouteContext = {
  params: Promise<{ projectId: string; year: string; month: string }>;
};

const NO_STORE = { "Cache-Control": "no-store" } as const;

// PUT /api/project-documentation/[projectId]/[year]/[month]
// Upserts the five week links and the note for one project-period. The period
// is path identity and is never accepted from the request body.
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { projectId, year, month } = await context.params;
    if (!isUuid(projectId)) return invalidIdResponse();

    const period = parsePeriodPath(year, month);
    const input = await parseJsonBody(request, updateProjectDocumentationSchema);
    const data = await updateDocumentation(
      actor,
      projectId,
      period.year,
      period.month,
      input,
    );
    return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/project-documentation/[projectId]/[year]/[month] failed",
    );
  }
}
