import { updateProjectGreenCertificateSchema } from "@/lib/green-building-esg/schema";
import {
  deleteProjectGreenCertificate,
  updateProjectGreenCertificate,
} from "@/lib/green-building-esg/service";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
  ok,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const input = await parseJsonBody(
      request,
      updateProjectGreenCertificateSchema,
    );
    const updated = await updateProjectGreenCertificate(actor, id, input);
    return ok({ data: updated });
  } catch (error) {
    return handleRouteError(
      error,
      "PUT /api/green-building-esg/certificates/[id]",
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await getActor();
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const result = await deleteProjectGreenCertificate(actor, id);
    return ok({ data: result });
  } catch (error) {
    return handleRouteError(
      error,
      "DELETE /api/green-building-esg/certificates/[id]",
    );
  }
}
