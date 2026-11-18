import {
  createProjectEsgAssessmentSchema,
  esgAssessmentListQuerySchema,
} from "@/lib/esg-assessment/schema";
import {
  createProjectEsgAssessment,
  listProjectEsgAssessments,
} from "@/lib/esg-assessment/service";
import {
  getActor,
  handleRouteError,
  ok,
  parseJsonBody,
  validationErrorResponse,
} from "../_helpers";

// GET /api/green-building-esg/esg-assessments?year=2026&search=gedung
// `q` is accepted as an alias for `search`; both filters are combined with AND.
export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const params = new URL(request.url).searchParams;
    const search = params.get("search") ?? params.get("q") ?? undefined;
    const parsed = esgAssessmentListQuerySchema.safeParse({
      year: params.get("year") ?? undefined,
      search,
    });
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await listProjectEsgAssessments(actor, parsed.data);
    return ok({
      data: result.items,
      meta: {
        total: result.items.length,
        available_years: result.available_years,
      },
    });
  } catch (error) {
    return handleRouteError(
      error,
      "GET /api/green-building-esg/esg-assessments",
    );
  }
}

// POST ignores any client `year`: the service snapshots master_projects.year.
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(
      request,
      createProjectEsgAssessmentSchema,
    );
    const created = await createProjectEsgAssessment(actor, input);
    return ok({ data: created }, 201);
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/green-building-esg/esg-assessments",
    );
  }
}
