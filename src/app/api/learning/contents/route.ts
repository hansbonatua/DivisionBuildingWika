import {
  createLearningContentSchema,
  learningContentListQuerySchema,
} from "@/lib/learning/schema";
import {
  createLearningContent,
  listLearningContents,
} from "@/lib/learning/service";
import {
  getActor,
  handleRouteError,
  ok,
  parseJsonBody,
  validationErrorResponse,
} from "../_helpers";

// GET /api/learning/contents?type=sharing&category=<uuid>&q=&page=
//
// `type` is required: the three submenus and the Admin Control tabs always ask
// for one catalogue at a time. `category` and `q` narrow that catalogue.
export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const params = new URL(request.url).searchParams;

    const parsed = learningContentListQuerySchema.safeParse({
      type: params.get("type") ?? undefined,
      category: params.get("category")?.trim() || undefined,
      q: params.get("q")?.trim() || undefined,
      page: params.get("page") ?? undefined,
    });
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const result = await listLearningContents(actor, parsed.data);
    return ok({
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        page_size: result.page_size,
        available_categories: result.available_categories,
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/learning/contents");
  }
}

// POST /api/learning/contents
// Metadata only: the thumbnail and attachments were uploaded to Blob before
// this call and are re-verified server-side from their pathnames.
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(request, createLearningContentSchema);
    const created = await createLearningContent(actor, input);
    return ok({ data: created }, 201);
  } catch (error) {
    return handleRouteError(error, "POST /api/learning/contents");
  }
}
