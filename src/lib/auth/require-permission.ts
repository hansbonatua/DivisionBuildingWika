import { NextResponse } from "next/server";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { requireUser, UnauthenticatedError, type SafeUser } from "@/lib/auth/current-user";
import { UsersForbiddenError } from "@/lib/users/access";
import { CmsForbiddenError } from "@/lib/cms/access";

// Small shared server-side permission plumbing for route handlers.
//
// Deliberately NOT a middleware/decorator framework: authentication stays in
// @/lib/auth/current-user, feature permissions stay in @/lib/auth/permissions,
// and this file only turns both into a consistent 401/403 HTTP outcome.
//
// Service layers still assert their own permission; this helper guarantees the
// response shape and ordering (authentication → authorization → body parsing →
// domain work), and avoids repeating the same 401/403 branches in every route.

export class ForbiddenError extends Error {
  constructor(message = "Akses ditolak") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// The authenticated active actor, or the denial response to return as-is.
export type PermittedActorResult = { actor: SafeUser } | { response: NextResponse };

export function forbiddenResponse(message = "Akses ditolak"): NextResponse {
  return NextResponse.json({ error: { message } }, { status: 403 });
}

function unauthenticatedResponse(): NextResponse {
  return NextResponse.json({ error: { message: "Unauthenticated" } }, { status: 401 });
}

// Authenticates the actor and asserts the feature permission. Suspended users
// resolve to no user at all (existing convention) and therefore get 401, not
// 403, regardless of their role.
export async function getPermittedActor(
  permission: Permission,
): Promise<PermittedActorResult> {
  try {
    const user = await requireUser();
    if (!hasPermission(user.role, permission)) {
      return { response: forbiddenResponse() };
    }
    return { actor: user };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { response: unauthenticatedResponse() };
    }
    throw error;
  }
}

// Maps a permission denial raised anywhere in the request (including at the
// service layer) to 403, so a defense-in-depth assertion can never surface as
// a 500. Returns null for unrelated errors.
export function mapPermissionError(error: unknown): NextResponse | null {
  if (error instanceof ForbiddenError) {
    return forbiddenResponse(error.message);
  }
  if (error instanceof UsersForbiddenError) {
    return forbiddenResponse(error.message);
  }
  if (error instanceof CmsForbiddenError) {
    return forbiddenResponse(error.message);
  }
  return null;
}
