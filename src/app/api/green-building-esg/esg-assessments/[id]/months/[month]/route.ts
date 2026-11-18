import { patchProjectEsgMonthSchema } from "@/lib/esg-assessment/schema";
import { patchProjectEsgMonthStatus } from "@/lib/esg-assessment/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  ok,
  parseJsonBody,
} from "../../../../_helpers";

type RouteContext = { params: Promise<{ id: string; month: string }> };

const MONTH_SEGMENT_RE = /^(?:[1-9]|1[0-2])$/;

// PATCH /api/green-building-esg/esg-assessments/{id}/months/{month}
// Body: { "status": "Complete" | "Half" | null }. Returns the complete DTO so
// the grid can reconcile its month list and counters without refetching.
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id, month } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();
    if (!MONTH_SEGMENT_RE.test(month)) {
      return invalidIdResponse("Bulan tidak valid");
    }

    const input = await parseJsonBody(request, patchProjectEsgMonthSchema);
    const updated = await patchProjectEsgMonthStatus(
      actor,
      id,
      Number(month),
      input.status,
    );
    return ok({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PATCH /api/green-building-esg/esg-assessments/[id]/months/[month]",
    );
  }
}
