import { cookies } from "next/headers";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { toSafeUser, type SafeUser } from "@/lib/users/service";
import { findUserById as findUserRowById } from "@/lib/users/repository";

// Server-only helpers for route handlers and server layout guards.
// No permission checks here — authentication answers only
// "is this user authenticated and active?" (RBAC comes later).

export type { SafeUser };

export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const session = await findSessionByToken(token);
  if (!session) {
    return null;
  }
  const user = await findUserRowById(session.userId);
  if (!user || user.status !== "active") {
    return null;
  }
  return toSafeUser(user);
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

// Server-side helper: returns the authenticated active user or throws
// UnauthenticatedError so route handlers/layout guards can map it to
// 401/redirect explicitly.
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }
  return user;
}
