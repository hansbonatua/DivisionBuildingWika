import {
  bigint,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Foundation-only enterprise users table. No roles/permissions/session
// tables — those belong to later phases (auth, RBAC).
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    phone: text("phone"),
    nip: text("nip").unique(),
    position: text("position").notNull(),
    photoUrl: text("photo_url"),
    role: text("role").notNull().default("Project"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "users_role_check",
      sql`${table.role} in ('Admin', 'Head Office', 'Project', 'Management')`,
    ),
    check("users_status_check", sql`${table.status} in ('active', 'suspended')`),
  ],
);

export type PgUser = typeof users.$inferSelect;
export type NewPgUser = typeof users.$inferInsert;

// Opaque database-backed sessions for authentication foundation.
// Cookie stores the RAW token; only its SHA-256 hash is persisted here.
// No roles/permissions tables — those belong to later phases (RBAC).
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export type PgSession = typeof sessions.$inferSelect;
export type NewPgSession = typeof sessions.$inferInsert;

// ---------------------------------------------------------------------------
// Core Enterprise: Kelola Program Kerja (Phase 1 — database foundation only).
// No service/UI logic here. Lock rules (immutable year, unit lock after RI,
// period coverage, RA editability) are enforced on the service layer later;
// the schema below only guarantees the shapes and invariants the database
// itself can express.
// ---------------------------------------------------------------------------

// Functional groups of Program Kerja (e.g. Structure, MEP Analysis).
export const programKerjaGroups = pgTable("program_kerja_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PgProgramKerjaGroup = typeof programKerjaGroups.$inferSelect;
export type NewPgProgramKerjaGroup = typeof programKerjaGroups.$inferInsert;

// A Program Kerja is locked to a single year (immutable after create —
// enforced on the service layer, not expressible as a column constraint).
export const programKerja = pgTable(
  "program_kerja",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      // Group in use cannot be deleted (explicit RESTRICT).
      .references(() => programKerjaGroups.id, { onDelete: "restrict" }),
    year: integer("year").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    startMonth: integer("start_month").notNull(),
    endMonth: integer("end_month").notNull(),
    parameter: text("parameter").notNull(),
    unit: text("unit").notNull(),
    monitor: text("monitor"),
    note: text("note"),
    evidenceUrl: text("evidence_url"),
    createdBy: uuid("created_by")
      .notNull()
      // Deleting a creator must never cascade-delete Program Kerja;
      // NO ACTION refuses the user delete while programs reference it.
      .references(() => users.id, { onDelete: "no action" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("program_kerja_group_id_idx").on(table.groupId),
    index("program_kerja_year_idx").on(table.year),
    index("program_kerja_created_by_idx").on(table.createdBy),
    check("program_kerja_year_check", sql`${table.year} >= 2000`),
    check(
      "program_kerja_start_month_check",
      sql`${table.startMonth} BETWEEN 1 AND 12`,
    ),
    check("program_kerja_end_month_check", sql`${table.endMonth} BETWEEN 1 AND 12`),
    check(
      "program_kerja_period_check",
      sql`${table.startMonth} <= ${table.endMonth}`,
    ),
    check("program_kerja_unit_check", sql`${table.unit} in ('Jumlah', 'Persentase')`),
  ],
);

export type PgProgramKerja = typeof programKerja.$inferSelect;
export type NewPgProgramKerja = typeof programKerja.$inferInsert;

// Vertical monthly rows (never horizontal Jan..Des columns). Each Program
// Kerja owns exactly 12 rows (enforced on the service layer). ra_value =
// Rencana (always present); ri_value = Realisasi, NULL = not yet reported,
// 0 = reported as zero. No total columns — aggregates are computed.
export const programKerjaMonthly = pgTable(
  "program_kerja_monthly",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programKerjaId: uuid("program_kerja_id")
      .notNull()
      .references(() => programKerja.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    raValue: numeric("ra_value").notNull(),
    riValue: numeric("ri_value"),
    riUpdatedBy: uuid("ri_updated_by").references(() => users.id, { onDelete: "set null" }),
    riUpdatedAt: timestamp("ri_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The UNIQUE composite also serves as the lookup index for the 12-row
    // fetch pattern, so no extra program_kerja_id index is added.
    unique("program_kerja_monthly_program_month_unique").on(table.programKerjaId, table.month),
    check("program_kerja_monthly_month_check", sql`${table.month} BETWEEN 1 AND 12`),
    check("program_kerja_monthly_ra_check", sql`${table.raValue} >= 0`),
    check(
      "program_kerja_monthly_ri_check",
      sql`${table.riValue} IS NULL OR ${table.riValue} >= 0`,
    ),
  ],
);

export type PgProgramKerjaMonthly = typeof programKerjaMonthly.$inferSelect;
export type NewPgProgramKerjaMonthly = typeof programKerjaMonthly.$inferInsert;

// Many-to-many Program Kerja ↔ users (PIC assignment). PIC is NOT a role:
// assignees are existing users (Head Office validation lives on the service
// layer, not in a CHECK). Deleting a program cascades its assignments;
// deleting a user with assignments is refused (NO ACTION) so assignment
// history is never silently lost — unassign explicitly first.
export const programKerjaPics = pgTable(
  "program_kerja_pics",
  {
    programKerjaId: uuid("program_kerja_id")
      .notNull()
      .references(() => programKerja.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.programKerjaId, table.userId] })],
);

export type PgProgramKerjaPic = typeof programKerjaPics.$inferSelect;
export type NewPgProgramKerjaPic = typeof programKerjaPics.$inferInsert;

// Template & Form (revised V1): every record has EXACTLY ONE source.
//   source_type = 'link'   -> file_url holds the external http(s) link
//   source_type = 'upload' -> blob_pathname/file_name describe the uploaded file
// file_url is therefore nullable and link-only; the CHECK constraint below makes
// impossible combinations unrepresentable, so no reader ever has to guess.
// blob_pathname is the single storage identity (no duplicate blob URL column)
// and is never exposed in API responses.
export const templateForms = pgTable(
  "template_forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull().default("link"),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    fileMimeType: text("file_mime_type"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    blobPathname: text("blob_pathname"),
    uploaderPicUserId: uuid("uploader_pic_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "template_forms_source_type_check",
      sql`${table.sourceType} in ('link', 'upload')`,
    ),
    check(
      "template_forms_source_integrity_check",
      sql`(
        (${table.sourceType} = 'link'
          and ${table.fileUrl} is not null
          and ${table.blobPathname} is null)
        or
        (${table.sourceType} = 'upload'
          and ${table.fileUrl} is null
          and ${table.blobPathname} is not null
          and ${table.fileName} is not null)
      )`,
    ),
    check(
      "template_forms_file_size_check",
      sql`${table.fileSizeBytes} is null or ${table.fileSizeBytes} > 0`,
    ),
    // One stored object cannot be claimed by two records.
    uniqueIndex("template_forms_blob_pathname_unique")
      .on(table.blobPathname)
      .where(sql`${table.blobPathname} is not null`),
    index("template_forms_uploader_pic_user_id_idx").on(table.uploaderPicUserId),
    index("template_forms_created_by_idx").on(table.createdBy),
  ],
);

export type PgTemplateForm = typeof templateForms.$inferSelect;
export type NewPgTemplateForm = typeof templateForms.$inferInsert;

export const masterProjects = pgTable(
  "master_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    location: text("location").notNull(),
    picUserId: uuid("pic_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("master_projects_pic_user_id_idx").on(table.picUserId),
    index("master_projects_created_by_idx").on(table.createdBy),
    uniqueIndex("master_projects_name_location_ci_unique").on(
      sql`lower(btrim(${table.name}))`,
      sql`lower(btrim(${table.location}))`,
    ),
    index("master_projects_name_trgm_idx").using(
      "gin",
      sql`${table.name} gin_trgm_ops`,
    ),
    index("master_projects_location_trgm_idx").using(
      "gin",
      sql`${table.location} gin_trgm_ops`,
    ),
  ],
);

export type PgMasterProject = typeof masterProjects.$inferSelect;
export type NewPgMasterProject = typeof masterProjects.$inferInsert;

// ---------------------------------------------------------------------------
// Core Enterprise: Engineering Databases (V1).
// One row per external file reference. The project is NEVER stored as free
// text: project_id references the canonical master_projects directory.
// RESTRICT (not CASCADE) so a Master Project still referenced by Engineering
// records cannot be deleted — engineering documentation is never silently
// removed as a side effect of directory cleanup. The category is validated by
// a CHECK constraint (no PostgreSQL enum type), mirroring users.role and
// program_kerja.unit. Multiple rows per (project, category) are valid: a
// project may hold many drawings or specifications in one category, so there
// is deliberately no unique constraint on that pair.
export const engineeringDatabaseEntries = pgTable(
  "engineering_database_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => masterProjects.id, { onDelete: "restrict" }),
    category: text("category").notNull(),
    fileUrl: text("file_url").notNull(),
    picUserId: uuid("pic_user_id")
      .notNull()
      // Deleting a user who is PIC of an Engineering record is refused
      // (NO ACTION): the reference is never silently orphaned.
      .references(() => users.id, { onDelete: "no action" }),
    note: text("note").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every list is category-scoped, so category leads; project_id follows so
    // the same index also serves per-project lookups inside a category.
    index("engineering_database_entries_category_project_id_idx").on(
      table.category,
      table.projectId,
    ),
    // Referencing-column index: keeps the RESTRICT check on Master Project
    // delete an index lookup instead of a sequential scan.
    index("engineering_database_entries_project_id_idx").on(table.projectId),
    index("engineering_database_entries_pic_user_id_idx").on(table.picUserId),
    index("engineering_database_entries_created_by_idx").on(table.createdBy),
    check(
      "engineering_database_entries_category_check",
      sql`${table.category} in ('ENGINEERING_DRAWING', 'ENGINEERING_DESIGN_REPORT', 'METODE_PELAKSANAAN_PEKERJAAN', 'SPESIFIKASI_TEKNIS', 'PROJECT_MASTER_SCHEDULE', 'BIM')`,
    ),
  ],
);

export type PgEngineeringDatabaseEntry = typeof engineeringDatabaseEntries.$inferSelect;
export type NewPgEngineeringDatabaseEntry = typeof engineeringDatabaseEntries.$inferInsert;
