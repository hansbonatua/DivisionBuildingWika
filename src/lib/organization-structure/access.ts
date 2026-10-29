import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";

// Struktur Organisasi access helper — pure and dependency-free (safe for route
// handlers, server page guards and Client Components), like every other module
// access helper.
//
// VIEW: every canonical role (Admin through the super-application shortcut).
// MANAGE: Admin only, by construction — ORGANIZATION_STRUCTURE_MANAGE has an
// empty non-Admin role list, so Head Office, Management, Project and any unknown
// role string fall through to `false`.
//
// No per-user capability exists here on purpose: this is not MSL. Visibility is
// uniform for authenticated roles, and only Admin may replace or remove the
// chart.

export function canViewOrganizationStructure(role: string): boolean {
  return hasPermission(role, PERMISSIONS.ORGANIZATION_STRUCTURE_VIEW);
}

export function canManageOrganizationStructure(role: string): boolean {
  return hasPermission(role, PERMISSIONS.ORGANIZATION_STRUCTURE_MANAGE);
}

// Raised by the service layer's defense-in-depth assertion so a permission
// denial can never surface as a 500 when the route guard was somehow skipped.
export class OrganizationStructureForbiddenError extends Error {
  constructor(message = "Akses Struktur Organisasi hanya untuk Admin") {
    super(message);
    this.name = "OrganizationStructureForbiddenError";
  }
}
