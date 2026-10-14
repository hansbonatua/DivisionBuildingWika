// Canonical WIBEX user roles — single source of truth.
// These exact strings are the canonical role identifiers, matching the
// PostgreSQL users.role CHECK constraint. Import from here; do not
// re-declare role literals or import role config from demo modules.
export const USER_ROLES = ["Admin", "Head Office", "Project", "Management"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLE: UserRole = "Admin";
export const HEAD_OFFICE_ROLE: UserRole = "Head Office";

// Plain string options for select inputs (derived, no duplication).
export const ROLE_OPTIONS: UserRole[] = [...USER_ROLES];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

// Future Core Enterprise (Program Kerja) access reference — NOT enforced.
// RBAC for Program Kerja will be developed with that feature.
//   Admin       → Summary Report, Kelola Program Kerja
//   Head Office → Summary Report, Kelola Program Kerja
//   Management  → Summary Report only
//   Project     → No Program Kerja access
