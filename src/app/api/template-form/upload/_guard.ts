import { NextResponse } from "next/server";
import { getActor } from "@/app/api/template-form/_helpers";
import {
  ensureTemplateFormManage,
  TemplateFormForbiddenError,
  type TemplateFormActor,
} from "@/lib/template-form/service";

/**
 * Authenticates the caller and applies the shared Template & Form MANAGE rule
 * (Admin, Head Office; active actors only).
 *
 * Returns `{ actor }` on success, or `{ response }` with the already-mapped
 * 401/403 response so callers can return it directly.
 */
export async function requireTemplateFormManageActor(): Promise<
  { actor: TemplateFormActor } | { response: NextResponse }
> {
  const auth = await getActor();
  if ("response" in auth) return auth;
  try {
    ensureTemplateFormManage(auth.actor);
    return { actor: auth.actor };
  } catch (error) {
    if (error instanceof TemplateFormForbiddenError) {
      return {
        response: NextResponse.json(
          { error: { message: error.message } },
          { status: 403 },
        ),
      };
    }
    throw error;
  }
}

export function isTemplateFormManageError(error: unknown): boolean {
  return error instanceof TemplateFormForbiddenError;
}
