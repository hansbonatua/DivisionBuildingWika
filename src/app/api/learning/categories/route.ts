import { createLearningCategorySchema } from "@/lib/learning/schema";
import {
  findOrCreateLearningCategory,
  listLearningCategories,
} from "@/lib/learning/service";
import { getActor, handleRouteError, ok, parseJsonBody } from "../_helpers";

// GET /api/learning/categories
// Shared category vocabulary for the filter chips and the Admin Control tabs.
export async function GET() {
  try {
    const actor = await getActor();
    const items = await listLearningCategories(actor);
    return ok({ data: items });
  } catch (error) {
    return handleRouteError(error, "GET /api/learning/categories");
  }
}

// POST /api/learning/categories
// Find-or-create by lower(btrim(nama)): the Admin types a category in the
// content form, and an existing spelling is reused instead of duplicated.
// 201 when a row was created, 200 when an existing one was returned.
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(request, createLearningCategorySchema);
    const result = await findOrCreateLearningCategory(actor, input);
    return ok({ data: result.category }, result.created ? 201 : 200);
  } catch (error) {
    return handleRouteError(error, "POST /api/learning/categories");
  }
}
