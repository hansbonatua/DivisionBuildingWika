import type { UserRole } from "@/lib/users/roles";
import {
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  MANAGEMENT_ROLE,
  PROJECT_ROLE,
} from "@/lib/users/roles";

// Canonical Engineering Databases categories — single source of truth.
// These exact strings match the PostgreSQL CHECK constraint on
// engineering_database_entries.category. Dependency-free module so Client
// Components can import it safely (same convention as PROGRAM_KERJA_UNITS).
export const ENGINEERING_DATABASE_CATEGORIES = [
  "ENGINEERING_DRAWING",
  "ENGINEERING_DESIGN_REPORT",
  "METODE_PELAKSANAAN_PEKERJAAN",
  "SPESIFIKASI_TEKNIS",
  "PROJECT_MASTER_SCHEDULE",
  "BIM",
] as const;

export type EngineeringDatabaseCategory =
  (typeof ENGINEERING_DATABASE_CATEGORIES)[number];

export const ENGINEERING_DATABASE_CATEGORY_LABELS: Record<
  EngineeringDatabaseCategory,
  string
> = {
  ENGINEERING_DRAWING: "Engineering Drawing",
  ENGINEERING_DESIGN_REPORT: "Engineering Design Report",
  METODE_PELAKSANAAN_PEKERJAAN: "Metode Pelaksanaan Pekerjaan",
  SPESIFIKASI_TEKNIS: "Spesifikasi Teknis",
  PROJECT_MASTER_SCHEDULE: "Project Master Schedule",
  BIM: "BIM",
};

// Route slugs used by the future dynamic category pages
// (/dashboard/engineering-database/[category]).
export const ENGINEERING_DATABASE_CATEGORY_SLUGS: Record<
  EngineeringDatabaseCategory,
  string
> = {
  ENGINEERING_DRAWING: "engineering-drawing",
  ENGINEERING_DESIGN_REPORT: "engineering-design-report",
  METODE_PELAKSANAAN_PEKERJAAN: "metode-pelaksanaan-pekerjaan",
  SPESIFIKASI_TEKNIS: "spesifikasi-teknis",
  PROJECT_MASTER_SCHEDULE: "project-master-schedule",
  BIM: "bim",
};

const SLUG_TO_CATEGORY: Record<
  string,
  EngineeringDatabaseCategory | undefined
> = ENGINEERING_DATABASE_CATEGORIES.reduce(
  (acc, category) => {
    acc[ENGINEERING_DATABASE_CATEGORY_SLUGS[category]] = category;
    return acc;
  },
  {} as Record<string, EngineeringDatabaseCategory | undefined>,
);

export function isEngineeringDatabaseCategory(
  value: string,
): value is EngineeringDatabaseCategory {
  return (ENGINEERING_DATABASE_CATEGORIES as readonly string[]).includes(value);
}

export function engineeringDatabaseCategoryToSlug(
  category: EngineeringDatabaseCategory,
): string {
  return ENGINEERING_DATABASE_CATEGORY_SLUGS[category];
}

// Returns null for an unknown slug so callers can fail safely (notFound()).
export function engineeringDatabaseCategoryFromSlug(
  slug: string,
): EngineeringDatabaseCategory | null {
  return SLUG_TO_CATEGORY[slug] ?? null;
}

// Engineering Database RBAC is intentionally NOT derived from Master Project:
// unlike Master Project, the Project role may also create and delete records.
const VIEW_ROLES: readonly UserRole[] = [
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  PROJECT_ROLE,
  MANAGEMENT_ROLE,
];

const MANAGE_ROLES: readonly UserRole[] = [
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  PROJECT_ROLE,
];

// PIC eligibility is role-based only (Management excluded). V1 deliberately
// does not filter options by account status — matching the existing PIC
// option queries in Master Project and Template & Form.
export const ENGINEERING_DATABASE_PIC_ROLES: readonly UserRole[] = [
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  PROJECT_ROLE,
];

export function canViewEngineeringDatabase(role: string): boolean {
  return (VIEW_ROLES as readonly string[]).includes(role);
}

export function canManageEngineeringDatabase(role: string): boolean {
  return (MANAGE_ROLES as readonly string[]).includes(role);
}

export function canViewEngineeringDatabaseSummary(role: string): boolean {
  return canViewEngineeringDatabase(role);
}

export function isEngineeringDatabasePicRole(role: string): boolean {
  return (ENGINEERING_DATABASE_PIC_ROLES as readonly string[]).includes(role);
}
