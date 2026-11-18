import { updateProjectEsgAssessmentSchema } from "@/lib/esg-assessment/schema";
import {
  deleteProjectEsgAssessment,
  updateProjectEsgAssessment,
} from "@/lib/esg-assessment/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  ok,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// PUT updates project and documentation only. Month statuses have their own
// PATCH endpoint and are preserved across a project change.
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(
      request,
      updateProjectEsgAssessmentSchema,
    );
    const updated = await updateProjectEsgAssessment(actor, id, input);
    return ok({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/green-building-esg/esg-assessments/[id]",
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const result = await deleteProjectEsgAssessment(actor, id);
    return ok({ data: result });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/green-building-esg/esg-assessments/[id]",
    );
  }
}
