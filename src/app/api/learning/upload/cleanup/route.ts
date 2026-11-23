import { deleteLearningBlobSchema } from "@/lib/learning/schema";
import { deleteLearningBlobIfUnreferenced } from "@/lib/learning/service";
import { getActor, handleRouteError, ok, parseJsonBody } from "../../_helpers";

// POST /api/learning/upload/cleanup
//
// Narrow orphan cleanup for the browser upload pipeline: one pathname, never an
// arbitrary blob key. The service refuses a pathname still referenced by a
// content row, so a successful save can never be undone by a late cleanup call.
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(request, deleteLearningBlobSchema);
    const data = await deleteLearningBlobIfUnreferenced(actor, input.pathname);
    return ok({ data });
  } catch (error) {
    return handleRouteError(error, "POST /api/learning/upload/cleanup");
  }
}
