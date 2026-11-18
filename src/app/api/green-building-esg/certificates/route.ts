import {
  createProjectGreenCertificateSchema,
  greenBuildingCertificateListQuerySchema,
} from "@/lib/green-building-esg/schema";
import {
  createProjectGreenCertificate,
  listProjectGreenCertificates,
} from "@/lib/green-building-esg/service";
import {
  getActor,
  handleRouteError,
  ok,
  parseJsonBody,
  validationErrorResponse,
} from "../_helpers";

// GET /api/green-building-esg/certificates?year=2026&search=gedung
// `q` is accepted as an alias for the P3 UI contract; `search` is the primary
// documented parameter. Both filters are combined with AND.
export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const params = new URL(request.url).searchParams;
    const search = params.get("search") ?? params.get("q") ?? undefined;
    const parsed = greenBuildingCertificateListQuerySchema.safeParse({
      year: params.get("year") ?? undefined,
      search,
    });
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await listProjectGreenCertificates(actor, parsed.data);
    return ok({
      data: result.items,
      meta: {
        total: result.items.length,
        available_years: result.available_years,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/green-building-esg/certificates");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(
      request,
      createProjectGreenCertificateSchema,
    );
    const created = await createProjectGreenCertificate(actor, input);
    return ok({ data: created }, 201);
  } catch (error) {
    return handleRouteError(error, "POST /api/green-building-esg/certificates");
  }
}
