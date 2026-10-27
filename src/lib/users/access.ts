import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// User Control (global user directory + administration) access helper.
// Dependency-free so Client Components can import it, exactly like the other
// module access helpers. All rules resolve through the central feature
// permission layer: USER_MANAGE is Admin-only, so Admin is allowed by the
// super-application rule and every other role — including unknown role
// strings — is denied.
//
// Self-profile (/dashboard/profile/edit, /api/auth/me) is deliberately NOT
// governed by this helper: every authenticated active user keeps access to
// their own safe fields.

export function canManageUsers(role: string): boolean {
  return hasPermission(role, PERMISSIONS.USER_MANAGE);
}

// Domain error raised by the service/domain layer when an actor without
// USER_MANAGE attempts a global user administration operation. Routes map it
// to 403.
export class UsersForbiddenError extends Error {
  constructor(message = "Akses User Directory hanya untuk Admin") {
    super(message);
    this.name = "UsersForbiddenError";
  }
}

export function assertCanManageUsers(role: string): void {
  if (!canManageUsers(role)) {
    throw new UsersForbiddenError();
  }
}
