import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { isManagement } from "@/lib/users/roles";

// MSL Engineering access helper — pure and dependency-free (safe for route
// handlers, server guards and Client Components), exactly like the other module
// access helpers.
//
// MSL eligibility is role + per-user capability, never capability alone:
//   Admin                  -> view + manage (super-application role rule)
//   Head Office            -> view only (role rule)
//   Management + mslAccess -> view + manage (capability)
//   Management (no access) -> nothing
//   Project                -> nothing
//
// `mslAccess` is a Management-only capability. The database keeps it false for
// every other role (see @/lib/users/service), and this helper additionally
// re-checks the role, so a stale flag can never grant access on its own.
//
// Record-level business rules (e.g. which projects a Management user may score)
// belong to the MSL module later; this file answers eligibility only.

export type MslActor = {
  role: string;
  mslAccess: boolean;
};

// Management capability, guarded by the role so a stale `msl_access = true` on
// a non-Management row is always inert.
function hasManagementCapability(actor: MslActor): boolean {
  return isManagement(actor.role) && actor.mslAccess === true;
}

export function canViewMsl(actor: MslActor): boolean {
  return (
    hasPermission(actor.role, PERMISSIONS.MSL_VIEW) ||
    hasManagementCapability(actor)
  );
}

export function canManageMsl(actor: MslActor): boolean {
  return (
    hasPermission(actor.role, PERMISSIONS.MSL_MANAGE) ||
    hasManagementCapability(actor)
  );
}
