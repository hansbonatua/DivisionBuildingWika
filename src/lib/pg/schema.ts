import {
  bigint,
  boolean,
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
    // Per-user capability for MSL Engineering. Deliberately NOT a role: only a
    // Management user can hold it, and it is forced back to false whenever the
    // resulting role is anything else (enforced on the service layer, see
    // @/lib/users/service). Admin/Head Office eligibility comes from the role
    // permission map instead, so they never need this flag. Default false means
    // every existing user is unaffected by its introduction.
    mslAccess: boolean("msl_access").notNull().default(false),
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

// Canonical project directory. A project belongs to EXACTLY ONE year: there is
// deliberately no start_year/end_year pair and no project↔year join table, so
// "the year of a project" has a single source of truth for every consumer
// (Master Project itself and MSL Engineering). year is editable through the
// normal edit flow. It is NOT part of the (name, location) identity: the same
// name+location in another year is still the same duplicate project.
export const masterProjects = pgTable(
  "master_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    location: text("location").notNull(),
    year: integer("year").notNull(),
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
    // Year is the MSL Engineering list/filter key, so it is indexed on its own.
    index("master_projects_year_idx").on(table.year),
    check("master_projects_year_check", sql`${table.year} >= 2000`),
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

// ---------------------------------------------------------------------------
// Authentication security: login attempt ledger (V1 brute-force protection).
//
// One row per credential attempt, used only to evaluate the temporary lockout
// and to answer "was this login a success or a failure, and when?".
//
// Privacy: the identity is stored as a SHA-256 hash of the normalized NIP
// (`identity_hash`), never as the raw NIP, so the ledger cannot be read as a
// list of real employee numbers. Nothing else about the credential is stored —
// no password, no password hash, no session token, no IP address.
//
// Growth is bounded by the policy itself: failures stop being written once an
// identity is locked (5 per 15 minutes), so a guessing run cannot inflate the
// table. Rows are never mutated, only inserted, which keeps the trail honest.
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // SHA-256(nip.trim()) as lowercase hex — 64 chars, fixed width.
    identityHash: text("identity_hash").notNull(),
    succeeded: boolean("succeeded").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Serves the recent-failure lookup exactly: filter by identity, filter by
    // outcome, then range-scan the window. Column order matches that query.
    index("login_attempts_identity_hash_succeeded_created_at_idx").on(
      table.identityHash,
      table.succeeded,
      table.createdAt,
    ),
    // Retention / housekeeping scans (oldest first or newest first) without
    // touching the identity index.
    index("login_attempts_created_at_idx").on(table.createdAt),
  ],
);

export type PgLoginAttempt = typeof loginAttempts.$inferSelect;
export type NewPgLoginAttempt = typeof loginAttempts.$inferInsert;

// ---------------------------------------------------------------------------
// MSL Engineering (V1): assessment foundation.
//
// A project carries at most ONE assessment (UNIQUE project_id, not
// UNIQUE(project_id, year)): the year is never duplicated here, it is always
// derived from master_projects.year, the single source of truth.
//
// The three components are the ONLY stored inputs. MSL score and MSL category
// are deliberately NOT columns — they are derived on the fly from the
// components (see @/lib/msl/score), so there is exactly one place where the
// formula and the category bands live.
//
// numeric(3,2) holds 1.00–5.00 exactly and matches the application contract of
// at most two decimals; the CHECK constraints make the range a database
// guarantee, not just a validation promise.
// RESTRICT on project_id: deleting a Master Project that an assessment still
// describes is refused (surfaced as 409 by the Master Project delete flow)
// instead of silently discarding completed MSL work.
export const mslAssessments = pgTable(
  "msl_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => masterProjects.id, { onDelete: "restrict" }),
    engineeringValue: numeric("engineering_value", { precision: 3, scale: 2 }).notNull(),
    metodeKerja: numeric("metode_kerja", { precision: 3, scale: 2 }).notNull(),
    engineeringExecution: numeric("engineering_execution", {
      precision: 3,
      scale: 2,
    }).notNull(),
    remarks: text("remarks"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The UNIQUE constraint also provides the project_id lookup index, so no
    // redundant index is added for it.
    unique("msl_assessments_project_unique").on(table.projectId),
    index("msl_assessments_created_by_idx").on(table.createdBy),
    index("msl_assessments_updated_by_idx").on(table.updatedBy),
    check(
      "msl_assessments_engineering_value_check",
      sql`${table.engineeringValue} >= 1 AND ${table.engineeringValue} <= 5`,
    ),
    check(
      "msl_assessments_metode_kerja_check",
      sql`${table.metodeKerja} >= 1 AND ${table.metodeKerja} <= 5`,
    ),
    check(
      "msl_assessments_engineering_execution_check",
      sql`${table.engineeringExecution} >= 1 AND ${table.engineeringExecution} <= 5`,
    ),
  ],
);

export type PgMslAssessment = typeof mslAssessments.$inferSelect;
export type NewPgMslAssessment = typeof mslAssessments.$inferInsert;

// One annual note per calendar year, covering the whole MSL picture for that
// year (never one note per project, so there is no project foreign key).
// A NULL note means "never written yet" and is distinct from an empty text.
export const mslYearNotes = pgTable(
  "msl_year_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    year: integer("year").notNull(),
    note: text("note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Serves both the one-note-per-year rule and the by-year lookup.
    unique("msl_year_notes_year_unique").on(table.year),
    index("msl_year_notes_created_by_idx").on(table.createdBy),
    index("msl_year_notes_updated_by_idx").on(table.updatedBy),
    check("msl_year_notes_year_check", sql`${table.year} >= 2000`),
  ],
);

export type PgMslYearNote = typeof mslYearNotes.$inferSelect;
export type NewPgMslYearNote = typeof mslYearNotes.$inferInsert;
