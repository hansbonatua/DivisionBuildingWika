import { greenBuildingProjectOptionsQuerySchema } from "@/lib/green-building-esg/schema";
import { listProjectOptions } from "@/lib/green-building-esg/service";
import {
  getActor,
  handleRouteError,
  ok,
  validationErrorResponse,
} from "../_helpers";

// GET /api/green-building-esg/project-options?q=gedung
// Manage-only picker feed. Returns at most 50 canonical projects with the
// fields needed by the form: id, name, location, year.
export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    const parsed = greenBuildingProjectOptionsQuerySchema.safeParse({ q });
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const options = await listProjectOptions(actor, parsed.data.q);
    return ok({ data: options });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/green-building-esg/project-options",
    );
  }
}
