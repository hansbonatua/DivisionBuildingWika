import type { UserRole } from "@/lib/users/roles";
import {
  HEAD_OFFICE_ROLE,
  MANAGEMENT_ROLE,
  PROJECT_ROLE,
  isAdmin,
} from "@/lib/users/roles";

// Central FEATURE-level permission layer.
//
// Pure and dependency-free (no DB, no cookies, no server-only imports) so the
// same rules can be used by route handlers, server layout guards, services and
// Client Components.
//
// Admin = SUPER APPLICATION: `hasPermission()` returns true for Admin on every
// feature permission. That shortcut is deliberately scoped to feature-level
// eligibility only. It must never be used to bypass authentication, active /
// suspended account rules, field validation, immutable domain fields, FK
// constraints, last-active-Admin protection or any other integrity rule.
//
// Record-level rules (e.g. Program Kerja RI requiring PIC assignment for Head
// Office) do NOT belong here; they stay in the owning module's access helper.

export const PERMISSIONS = {
  CMS_MANAGE: "CMS_MANAGE",
  USER_MANAGE: "USER_MANAGE",

  PROGRAM_KERJA_VIEW: "PROGRAM_KERJA_VIEW",
  PROGRAM_KERJA_MANAGE: "PROGRAM_KERJA_MANAGE",
  PROGRAM_KERJA_EDIT_RI: "PROGRAM_KERJA_EDIT_RI",

  TEMPLATE_FORM_VIEW: "TEMPLATE_FORM_VIEW",
  TEMPLATE_FORM_MANAGE: "TEMPLATE_FORM_MANAGE",

  MASTER_PROJECT_VIEW: "MASTER_PROJECT_VIEW",
  MASTER_PROJECT_CREATE: "MASTER_PROJECT_CREATE",
  MASTER_PROJECT_EDIT: "MASTER_PROJECT_EDIT",
  MASTER_PROJECT_DELETE: "MASTER_PROJECT_DELETE",

  ENGINEERING_DATABASE_VIEW: "ENGINEERING_DATABASE_VIEW",
  ENGINEERING_DATABASE_MANAGE: "ENGINEERING_DATABASE_MANAGE",

  MSL_VIEW: "MSL_VIEW",
  MSL_MANAGE: "MSL_MANAGE",

  ORGANIZATION_STRUCTURE_VIEW: "ORGANIZATION_STRUCTURE_VIEW",
  ORGANIZATION_STRUCTURE_MANAGE: "ORGANIZATION_STRUCTURE_MANAGE",

  DASHBOARD_SASAA_VIEW: "DASHBOARD_SASAA_VIEW",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Non-Admin role mapping for every permission. Admin is intentionally absent:
// it is granted centrally by the super-application shortcut in hasPermission()
// instead of being repeated in every role array (and therefore impossible to
// forget).
//
// CMS_MANAGE and USER_MANAGE are Admin-only by construction (empty role lists)
// and are enforced across sidebar, dashboard tiles, page guards, API routes and
// services (see @/lib/cms/access and @/lib/users/access). DASHBOARD_SASAA_VIEW
// is reserved for the future module; it is not used by any route today.
const NON_ADMIN_PERMISSION_ROLES: Record<Permission, readonly UserRole[]> = {
  CMS_MANAGE: [],
  USER_MANAGE: [],

  PROGRAM_KERJA_VIEW: [HEAD_OFFICE_ROLE, MANAGEMENT_ROLE],
  PROGRAM_KERJA_MANAGE: [HEAD_OFFICE_ROLE],
  PROGRAM_KERJA_EDIT_RI: [HEAD_OFFICE_ROLE],


  TEMPLATE_FORM_VIEW: [HEAD_OFFICE_ROLE, PROJECT_ROLE, MANAGEMENT_ROLE],
  TEMPLATE_FORM_MANAGE: [HEAD_OFFICE_ROLE],

  MASTER_PROJECT_VIEW: [HEAD_OFFICE_ROLE, PROJECT_ROLE, MANAGEMENT_ROLE],
  MASTER_PROJECT_CREATE: [HEAD_OFFICE_ROLE],
  MASTER_PROJECT_EDIT: [HEAD_OFFICE_ROLE, PROJECT_ROLE],
  MASTER_PROJECT_DELETE: [HEAD_OFFICE_ROLE],

  ENGINEERING_DATABASE_VIEW: [HEAD_OFFICE_ROLE, PROJECT_ROLE, MANAGEMENT_ROLE],
  ENGINEERING_DATABASE_MANAGE: [HEAD_OFFICE_ROLE, PROJECT_ROLE],

  // MSL Engineering: Head Office is a ROLE-level read-only viewer. Management
  // is deliberately absent from both lists — a Management user is eligible only
  // through the per-user `users.msl_access` capability, resolved by
  // @/lib/msl/access (never by the role map). Project has no access at all and
  // Admin gets both via the super-application shortcut.
  MSL_VIEW: [HEAD_OFFICE_ROLE],
  MSL_MANAGE: [],

  // Struktur Organisasi: an internal reference image. Every canonical role may
  // read it; replacing or removing it is Admin-only by construction (empty role
  // list), exactly like CMS_MANAGE and USER_MANAGE.
  ORGANIZATION_STRUCTURE_VIEW: [HEAD_OFFICE_ROLE, PROJECT_ROLE, MANAGEMENT_ROLE],
  ORGANIZATION_STRUCTURE_MANAGE: [],

  DASHBOARD_SASAA_VIEW: [HEAD_OFFICE_ROLE, MANAGEMENT_ROLE],
};

// Feature-level access check. Unknown role strings are never Admin and are not
// present in any role list, so they fall through to `false`.
export function hasPermission(role: string, permission: Permission): boolean {
  if (isAdmin(role)) {
    return true;
  }
  return (NON_ADMIN_PERMISSION_ROLES[permission] as readonly string[]).includes(
    role,
  );
}
