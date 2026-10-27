// Canonical WIBEX user roles — single source of truth.
// These exact strings are the canonical role identifiers, matching the
// PostgreSQL users.role CHECK constraint. Import from here; do not
// re-declare role literals or import role config from demo modules.
export const USER_ROLES = ["Admin", "Head Office", "Project", "Management"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLE: UserRole = "Admin";
export const HEAD_OFFICE_ROLE: UserRole = "Head Office";
export const MANAGEMENT_ROLE: UserRole = "Management";
export const PROJECT_ROLE: UserRole = "Project";

// Plain string options for select inputs (derived, no duplication).
export const ROLE_OPTIONS: UserRole[] = [...USER_ROLES];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

// Canonical role primitives — pure, dependency-free functions usable on the
// server and in Client Components. Feature-level permissions (and the Admin
// super-application rule) live in @/lib/auth/permissions; record-level rules
// (e.g. Program Kerja RI PIC assignment) stay in their module access helper.
export function isAdmin(role: string): boolean {
  return role === ADMIN_ROLE;
}

export function isHeadOffice(role: string): boolean {
  return role === HEAD_OFFICE_ROLE;
}

export function isProject(role: string): boolean {
  return role === PROJECT_ROLE;
}

export function isManagement(role: string): boolean {
  return role === MANAGEMENT_ROLE;
}

// True when `role` is one of the given canonical roles. Unknown role strings
// simply never match, so they can never gain access by accident.
export function hasRole(role: string, ...roles: readonly UserRole[]): boolean {
  return (roles as readonly string[]).includes(role);
}
