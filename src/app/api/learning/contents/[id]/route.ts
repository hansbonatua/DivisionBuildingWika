import { updateLearningContentSchema } from "@/lib/learning/schema";
import {
  deleteLearningContent,
  getLearningContent,
  updateLearningContent,
} from "@/lib/learning/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  ok,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/learning/contents/[id]
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const actor = await getActor();
    const detail = await getLearningContent(actor, id);
    return ok({ data: detail });
  } catch (error) {
    return handleRouteError(error, "GET /api/learning/contents/[id]");
  }
}

// PATCH /api/learning/contents/[id]
// Partial metadata update. `type` is immutable; attachments (when sent) are a
// replace-set keyed by pathname.
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const actor = await getActor();
    const input = await parseJsonBody(request, updateLearningContentSchema);
    const updated = await updateLearningContent(actor, id, input);
    return ok({ data: updated });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/learning/contents/[id]");
  }
}

// DELETE /api/learning/contents/[id]
// The parent row is removed in a transaction (attachments cascade), then the
// thumbnail and attachment blobs are deleted best-effort.
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const actor = await getActor();
    const result = await deleteLearningContent(actor, id);
    return ok({ data: result });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/learning/contents/[id]");
  }
}
