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

export const BERKAS_STATUSES = [
  "MENUNGGU_TTD_1",
  "MENUNGGU_TTD_2",
  "SELESAI",
  "DITOLAK",
] as const;

export type BerkasStatus = (typeof BERKAS_STATUSES)[number];

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

// ---------------------------------------------------------------------------
// Core Enterprise: Knowledge Management (V2).
//
// ONE shared table for the three submenus (Lesson Learn, Best Practice / KI KM,
// VA/VE) instead of three identical tables: the columns are identical, the only
// difference is `knowledge_type`. V2 allows MANY records per project per
// submenu, so the V1 UNIQUE(project_id, knowledge_type) constraint is gone; the
// non-unique composite index below serves the list ordering.
//
// project_id is ON DELETE RESTRICT: a Master Project that already carries
// knowledge cannot be hard-deleted, so user-entered knowledge is never silently
// destroyed. Master Project already maps 23503/23001 to a 409 conflict.
export const knowledgeEntries = pgTable(
  "knowledge_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => masterProjects.id, { onDelete: "restrict" }),
    knowledgeType: text("knowledge_type").notNull(),
    // Plain multiline text (paragraphs, "- " bullets, "1. " numbered lists).
    // Line breaks are preserved verbatim; no HTML/Markdown is ever rendered.
    content: text("content").notNull(),
    // Optimistic concurrency token. It starts at 1 and increments on every
    // successful update; DELETE also receives an expected_version.
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // V2 list ordering: type first, then project, then stable creation/id tie-breakers.
    index("knowledge_entries_type_project_created_idx").on(
      table.knowledgeType,
      table.projectId,
      table.createdAt,
      table.id,
    ),
    index("knowledge_entries_created_by_idx").on(table.createdBy),
    check(
      "knowledge_entries_knowledge_type_check",
      sql`${table.knowledgeType} in ('lesson_learn', 'best_practice', 'va_ve')`,
    ),
    check("knowledge_entries_content_check", sql`length(btrim(${table.content})) > 0`),
    check("knowledge_entries_version_check", sql`${table.version} >= 1`),
  ],
);

export type PgKnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type NewPgKnowledgeEntry = typeof knowledgeEntries.$inferInsert;

// Exactly one active evidence per knowledge record. Name + http(s) URL only —
// WIBEX never uploads or copies the referenced files. The UNIQUE constraint
// enforces the maximum; the deferred trigger in migration 0016 enforces the
// minimum at COMMIT.
//
// Trigger DDL is intentionally in the migration files, because Drizzle's
// pgTable has no trigger builder:
// - knowledge_entries_immutable_fields_trigger (BEFORE UPDATE, 0015) keeps
//   project_id and knowledge_type immutable;
// - knowledge_entries_require_evidence_trigger (AFTER INSERT OR UPDATE,
//   DEFERRABLE INITIALLY DEFERRED, 0016) rejects an entry with no active
//   evidence;
// - knowledge_evidence_require_remaining_trigger (AFTER DELETE, DEFERRABLE
//   INITIALLY DEFERRED, 0016) rejects deleting the last active evidence.
//
// V1 sort_order is intentionally absent from this V2 schema. Existing V1
// repository/service code still references sortOrder and is expected to fail
// typecheck until Sub-Fase B removes those references; 0017 drops the column.
export const knowledgeEvidence = pgTable(
  "knowledge_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeEntryId: uuid("knowledge_entry_id")
      .notNull()
      .references(() => knowledgeEntries.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("knowledge_evidence_entry_unique").on(table.knowledgeEntryId),
    check("knowledge_evidence_name_check", sql`length(btrim(${table.name})) > 0`),
    check("knowledge_evidence_url_check", sql`${table.url} ~ '^https?://'`),
  ],
);

export type PgKnowledgeEvidence = typeof knowledgeEvidence.$inferSelect;
export type NewPgKnowledgeEvidence = typeof knowledgeEvidence.$inferInsert;

// Multiple PIC users per knowledge record (Head Office eligibility is a service
// rule, not a CHECK). Deleting a record cascades its assignments; deleting a
// user with assignments is refused so assignment history is never lost.
export const knowledgePics = pgTable(
  "knowledge_pics",
  {
    knowledgeEntryId: uuid("knowledge_entry_id")
      .notNull()
      .references(() => knowledgeEntries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.knowledgeEntryId, table.userId] })],
);

export type PgKnowledgePic = typeof knowledgePics.$inferSelect;

// Migration-only archive. This deliberately has NO foreign keys to the active
// entry/evidence/project/user rows: the archive must survive permanent delete,
// and it is an audit snapshot rather than a live aggregate. It is never read by
// the V2 CRUD query path.
export const knowledgeEvidenceArchive = pgTable(
  "knowledge_evidence_archive",
  {
    archiveId: uuid("archive_id").primaryKey().defaultRandom(),
    evidenceId: uuid("evidence_id").notNull(),
    knowledgeEntryId: uuid("knowledge_entry_id").notNull(),
    projectId: uuid("project_id").notNull(),
    knowledgeType: text("knowledge_type").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    originalSortOrder: integer("original_sort_order"),
    originalCreatedAt: timestamp("original_created_at", { withTimezone: true }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }).notNull().defaultNow(),
    archivedBy: uuid("archived_by").notNull(),
    archiveReason: text("archive_reason").notNull(),
    keptEvidenceId: uuid("kept_evidence_id").notNull(),
  },
  (table) => [
    unique("knowledge_evidence_archive_evidence_id_unique").on(table.evidenceId),
  ],
);

export type PgKnowledgeEvidenceArchive = typeof knowledgeEvidenceArchive.$inferSelect;
export type NewPgKnowledgeEvidenceArchive = typeof knowledgeEvidenceArchive.$inferInsert;

// Owner selection register used by the migration gate. Like the archive, it is
// a controlled pre-migration snapshot: no FKs to live rows, and exactly one
// keep row per multi-evidence entry is checked by the migration process.
export const knowledgeEvidenceSelection = pgTable(
  "knowledge_evidence_selection",
  {
    entryId: uuid("entry_id").notNull(),
    evidenceId: uuid("evidence_id").notNull(),
    decision: text("decision").notNull(),
    reason: text("reason").notNull(),
    selectedBy: uuid("selected_by").notNull(),
    selectedAt: timestamp("selected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.evidenceId] }),
    check(
      "knowledge_evidence_selection_decision_check",
      sql`${table.decision} in ('keep', 'archive')`,
    ),
  ],
);

export type PgKnowledgeEvidenceSelection = typeof knowledgeEvidenceSelection.$inferSelect;
export type NewPgKnowledgeEvidenceSelection = typeof knowledgeEvidenceSelection.$inferInsert;

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
// MSL Engineering (V2.1): MONTHLY assessment foundation.
//
// A project carries at most ONE assessment per MONTH (UNIQUE(project_id,
// assessment_month)). The month is stored here because it is part of the
// assessment's identity; the YEAR is never duplicated — it is always derived
// from master_projects.year, the single source of truth.
//
// Every month is independent: no rule requires an earlier month to be filled
// before a later one, and no sequential ordering is enforced anywhere.
// `assessment_month` is immutable after creation (moving a row to another month
// is a delete + create), which is enforced by the application contract.
//
// The three components are the ONLY stored inputs. MSL score and MSL category
// are deliberately NOT columns — they are derived on the fly from the
// components (see @/lib/msl/score), so there is exactly one place where the
// formula and the category bands live.
//
// numeric(3,2) holds 0.00–5.00 exactly and matches the application contract of
// at most two decimals; the CHECK constraints make the range a database
// guarantee, not just a validation promise. 0 is a valid rating and is distinct
// from "not assessed" (which is the absence of a row).
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
    assessmentMonth: integer("assessment_month").notNull(),
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
    // Identity is project + month. The composite UNIQUE also provides the
    // project_id lookup index, so no redundant index is added for it.
    unique("msl_assessments_project_month_unique").on(
      table.projectId,
      table.assessmentMonth,
    ),
    index("msl_assessments_created_by_idx").on(table.createdBy),
    index("msl_assessments_updated_by_idx").on(table.updatedBy),
    check(
      "msl_assessments_month_check",
      sql`${table.assessmentMonth} BETWEEN 1 AND 12`,
    ),
    check(
      "msl_assessments_engineering_value_check",
      sql`${table.engineeringValue} >= 0 AND ${table.engineeringValue} <= 5`,
    ),
    check(
      "msl_assessments_metode_kerja_check",
      sql`${table.metodeKerja} >= 0 AND ${table.metodeKerja} <= 5`,
    ),
    check(
      "msl_assessments_engineering_execution_check",
      sql`${table.engineeringExecution} >= 0 AND ${table.engineeringExecution} <= 5`,
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

// ---------------------------------------------------------------------------
// Struktur Organisasi (V1): exactly ONE active organization chart.
//
// Singleton by construction, not by convention: `singleton` is always true and
// is constrained twice — CHECK (singleton) rejects `false`, UNIQUE (singleton)
// rejects a second row. "No chart yet" is therefore the absence of a row, which
// is why the table has no `is_active`/version/valid-from columns and no history:
// replacing the chart overwrites this single row.
//
// Storage identity is `blob_pathname` (inside the PUBLIC CMS store namespace
// `cms/organization/`), never a duplicated blob URL: ownership detection and
// orphan cleanup compare the pathname, so a hot-linked external URL can never be
// mistaken for an object this module is allowed to delete. `image_url` remains
// the single render field the viewer reads.
//
// Actor convention (see program_kerja_monthly.ri_updated_by): `created_by` is
// authorship and is NOT NULL + NO ACTION, so deleting the first uploader is
// refused while the row exists. `updated_by` is a last-touch pointer and is
// nullable + SET NULL, so deleting the most recent updater never fails and
// never pins a user to this global row.
export const organizationStructure = pgTable(
  "organization_structure",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The only permitted value is `true`; see the two constraints below.
    singleton: boolean("singleton").notNull().default(true),
    imageUrl: text("image_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    // Server-derived display name (final pathname segment), never client input.
    fileName: text("file_name"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // CHECK + UNIQUE together make a second row unrepresentable.
    uniqueIndex("organization_structure_singleton_unique").on(table.singleton),
    check("organization_structure_singleton_check", sql`${table.singleton}`),
    check(
      "organization_structure_image_url_check",
      sql`length(btrim(${table.imageUrl})) > 0`,
    ),
    check(
      "organization_structure_blob_pathname_check",
      sql`length(btrim(${table.blobPathname})) > 0`,
    ),
    // Referencing-column index so the RESTRICT check on user delete is a lookup.
    index("organization_structure_created_by_idx").on(table.createdBy),
  ],
);

export type PgOrganizationStructure = typeof organizationStructure.$inferSelect;
export type NewPgOrganizationStructure = typeof organizationStructure.$inferInsert;

// ---------------------------------------------------------------------------
// Core Enterprise: Metode Kerja Standar (MKS) — database foundation.
//
// Enam disiplin A–F adalah konstanta aplikasi, bukan tabel/seed: F. Lainnya
// harus selalu tersedia meskipun belum punya sub-kategori. Disiplin disimpan
// sebagai text + CHECK (pola users.role/program_kerja.unit), bukan enum type.
//
// Item tidak menduplikasi `disiplin`; disiplin selalu diturunkan dari
// sub-kategori induk agar hanya ada satu sumber kebenaran. Kode unik per
// parent, case-insensitive melalui expression index lower(btrim(kode)).
//
// PIC memakai satu tabel relasi dengan dua nullable FK (sub-kategori atau
// item) dan CHECK tepat satu target. Ini menjaga FK nyata ke users sekaligus
// mencegah PIC ganda lewat partial unique index. PIC sub-kategori opsional;
// PIC item minimal satu (dijaga deferred trigger di migration 0016).
//
// Trigger DDL sengaja berada di migration, karena pgTable tidak punya trigger
// builder:
// - metode_kerja_item_require_pic_trigger (AFTER INSERT OR UPDATE, deferred)
//   menolak item tanpa PIC saat COMMIT;
// - metode_kerja_pic_require_remaining_trigger (AFTER DELETE, deferred)
//   menolak penghapusan PIC terakhir dari item yang masih ada, tetapi tidak
//   menghalangi cascade delete item. Sub-kategori tidak punya trigger minimum
//   karena PIC-nya opsional.
export const metodeKerjaSubKategori = pgTable(
  "metode_kerja_sub_kategori",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    disiplin: text("disiplin").notNull(),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    evidenceUrl: text("evidence_url"),
    note: text("note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("metode_kerja_sub_kategori_disiplin_sort_idx").on(
      table.disiplin,
      table.sortOrder,
      table.id,
    ),
    uniqueIndex("metode_kerja_sub_kategori_disiplin_kode_unique").on(
      table.disiplin,
      sql`lower(btrim(${table.kode}))`,
    ),
    index("metode_kerja_sub_kategori_created_by_idx").on(table.createdBy),
    index("metode_kerja_sub_kategori_updated_by_idx").on(table.updatedBy),
    check(
      "metode_kerja_sub_kategori_disiplin_check",
      sql`${table.disiplin} in ('A', 'B', 'C', 'D', 'E', 'F')`,
    ),
    check(
      "metode_kerja_sub_kategori_kode_check",
      sql`length(btrim(${table.kode})) between 1 and 30`,
    ),
    check("metode_kerja_sub_kategori_sort_check", sql`${table.sortOrder} >= 0`),
    check(
      "metode_kerja_sub_kategori_evidence_check",
      sql`${table.evidenceUrl} is null or ${table.evidenceUrl} ~ '^https?://'`,
    ),
    check(
      "metode_kerja_sub_kategori_note_check",
      sql`${table.note} is null or length(${table.note}) <= 2000`,
    ),
  ],
);

export type PgMetodeKerjaSubKategori = typeof metodeKerjaSubKategori.$inferSelect;
export type NewPgMetodeKerjaSubKategori = typeof metodeKerjaSubKategori.$inferInsert;

export const metodeKerjaItem = pgTable(
  "metode_kerja_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subKategoriId: uuid("sub_kategori_id")
      .notNull()
      .references(() => metodeKerjaSubKategori.id, { onDelete: "restrict" }),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    evidenceUrl: text("evidence_url"),
    note: text("note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("metode_kerja_item_sub_kategori_sort_idx").on(
      table.subKategoriId,
      table.sortOrder,
      table.id,
    ),
    uniqueIndex("metode_kerja_item_sub_kategori_kode_unique").on(
      table.subKategoriId,
      sql`lower(btrim(${table.kode}))`,
    ),
    index("metode_kerja_item_created_by_idx").on(table.createdBy),
    index("metode_kerja_item_updated_by_idx").on(table.updatedBy),
    check(
      "metode_kerja_item_kode_check",
      sql`length(btrim(${table.kode})) between 1 and 30`,
    ),
    check("metode_kerja_item_sort_check", sql`${table.sortOrder} >= 0`),
    check(
      "metode_kerja_item_evidence_check",
      sql`${table.evidenceUrl} is null or ${table.evidenceUrl} ~ '^https?://'`,
    ),
    check(
      "metode_kerja_item_note_check",
      sql`${table.note} is null or length(${table.note}) <= 2000`,
    ),
  ],
);

export type PgMetodeKerjaItem = typeof metodeKerjaItem.$inferSelect;
export type NewPgMetodeKerjaItem = typeof metodeKerjaItem.$inferInsert;

export const metodeKerjaPic = pgTable(
  "metode_kerja_pic",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subKategoriId: uuid("sub_kategori_id").references(() => metodeKerjaSubKategori.id, {
      onDelete: "cascade",
    }),
    itemId: uuid("item_id").references(() => metodeKerjaItem.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "metode_kerja_pic_target_check",
      sql`((${table.subKategoriId} is not null)::int + (${table.itemId} is not null)::int) = 1`,
    ),
    uniqueIndex("metode_kerja_pic_sub_kategori_user_unique")
      .on(table.subKategoriId, table.userId)
      .where(sql`${table.subKategoriId} is not null`),
    uniqueIndex("metode_kerja_pic_item_user_unique")
      .on(table.itemId, table.userId)
      .where(sql`${table.itemId} is not null`),
    index("metode_kerja_pic_sub_kategori_idx").on(table.subKategoriId),
    index("metode_kerja_pic_item_idx").on(table.itemId),
    index("metode_kerja_pic_user_idx").on(table.userId),
  ],
);

export type PgMetodeKerjaPic = typeof metodeKerjaPic.$inferSelect;
export type NewPgMetodeKerjaPic = typeof metodeKerjaPic.$inferInsert;

// ---------------------------------------------------------------------------
// Calculation Sheet Template (CST): FLAT master reference.
//
// Deliberately a single table with no child tables and no `sort_order`:
// categories are application constants (see
// @/lib/calculation-sheet-template/constants), every row belongs to exactly
// one category, and there is no reorder feature. `kategori` stores the stable
// lowercase id (not the display label) and is immutable after creation; the
// API rejects it in update bodies.
//
// Kode is unique PER CATEGORY (case/whitespace insensitive), matching the
// product rule that kode carries no category prefix. Evidence is a URL only
// (no upload/blob): http(s), max 2048 characters, or NULL.
//
// Actor convention matches the other enterprise tables: `created_by` is
// authorship (NOT NULL, NO ACTION) while `updated_by` is a last-touch pointer
// (nullable, SET NULL). PIC is a single Head Office user and may not be
// deleted while a template still references it.
export const calculationSheetTemplates = pgTable(
  "calculation_sheet_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kategori: text("kategori").notNull(),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    picUserId: uuid("pic_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    evidenceUrl: text("evidence_url"),
    catatan: text("catatan"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("calculation_sheet_templates_kategori_kode_unique").on(
      table.kategori,
      sql`lower(btrim(${table.kode}))`,
    ),
    index("calculation_sheet_templates_kategori_idx").on(table.kategori),
    index("calculation_sheet_templates_kode_idx").on(table.kode),
    index("calculation_sheet_templates_pic_user_idx").on(table.picUserId),
    index("calculation_sheet_templates_created_by_idx").on(table.createdBy),
    index("calculation_sheet_templates_updated_by_idx").on(table.updatedBy),
    check(
      "calculation_sheet_templates_kategori_check",
      sql`${table.kategori} in ('arsitektur', 'struktur', 'infrastruktur', 'geoteknik', 'green_building', 'meep', 'lainnya')`,
    ),
    check(
      "calculation_sheet_templates_kode_check",
      sql`length(btrim(${table.kode})) between 1 and 30`,
    ),
    check(
      "calculation_sheet_templates_nama_check",
      sql`length(btrim(${table.nama})) between 1 and 200`,
    ),
    check(
      "calculation_sheet_templates_evidence_check",
      sql`${table.evidenceUrl} is null or (${table.evidenceUrl} ~ '^https?://' and length(${table.evidenceUrl}) <= 2048)`,
    ),
    check(
      "calculation_sheet_templates_catatan_check",
      sql`${table.catatan} is null or length(${table.catatan}) <= 2000`,
    ),
  ],
);

export type PgCalculationSheetTemplate = typeof calculationSheetTemplates.$inferSelect;
export type NewPgCalculationSheetTemplate = typeof calculationSheetTemplates.$inferInsert;

// Project Documentation (PDOC): FLAT one-row-per-project-period table.
//
// Rows are driven by Master Project; this table never creates projects. The
// five weeks are fixed application slots, so they are explicit columns rather
// than a child table. Each week owns its URL plus last-touch audit pair, while
// `catatan` is per project-period. Clearing a link follows the Owner decision:
// the URL and its audit pair are all set to NULL.
//
// (project_id, year, month) is UNIQUE and project_id is ON DELETE RESTRICT:
// one documentation row per project-period, and a Master Project with
// documentation cannot be hard-deleted. `year` is the documentation year, not
// master_projects.year; it is deliberately not tied to the project year.
// Actor convention matches the other enterprise tables: `created_by` is
// authorship (NOT NULL, NO ACTION) while `updated_by` is a last-touch pointer
// (nullable, SET NULL).
export const projectDocumentations = pgTable(
  "project_documentations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => masterProjects.id, { onDelete: "restrict" }),

    year: integer("year").notNull(),
    month: integer("month").notNull(),

    week1Url: text("week_1_url"),
    week1UpdatedBy: uuid("week_1_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week1UpdatedAt: timestamp("week_1_updated_at", { withTimezone: true }),

    week2Url: text("week_2_url"),
    week2UpdatedBy: uuid("week_2_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week2UpdatedAt: timestamp("week_2_updated_at", { withTimezone: true }),

    week3Url: text("week_3_url"),
    week3UpdatedBy: uuid("week_3_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week3UpdatedAt: timestamp("week_3_updated_at", { withTimezone: true }),

    week4Url: text("week_4_url"),
    week4UpdatedBy: uuid("week_4_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week4UpdatedAt: timestamp("week_4_updated_at", { withTimezone: true }),

    week5Url: text("week_5_url"),
    week5UpdatedBy: uuid("week_5_updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    week5UpdatedAt: timestamp("week_5_updated_at", { withTimezone: true }),

    catatan: text("catatan"),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_documentations_project_period_unique").on(
      table.projectId,
      table.year,
      table.month,
    ),
    index("project_documentations_year_month_idx").on(table.year, table.month),
    check(
      "project_documentations_month_check",
      sql`${table.month} BETWEEN 1 AND 12`,
    ),
    check(
      "project_documentations_year_check",
      sql`${table.year} >= 2000`,
    ),
    check(
      "project_documentations_week_1_url_check",
      sql`${table.week1Url} is null or (${table.week1Url} ~ '^https?://' and length(${table.week1Url}) <= 2048)`,
    ),
    check(
      "project_documentations_week_2_url_check",
      sql`${table.week2Url} is null or (${table.week2Url} ~ '^https?://' and length(${table.week2Url}) <= 2048)`,
    ),
    check(
      "project_documentations_week_3_url_check",
      sql`${table.week3Url} is null or (${table.week3Url} ~ '^https?://' and length(${table.week3Url}) <= 2048)`,
    ),
    check(
      "project_documentations_week_4_url_check",
      sql`${table.week4Url} is null or (${table.week4Url} ~ '^https?://' and length(${table.week4Url}) <= 2048)`,
    ),
    check(
      "project_documentations_week_5_url_check",
      sql`${table.week5Url} is null or (${table.week5Url} ~ '^https?://' and length(${table.week5Url}) <= 2048)`,
    ),
    check(
      "project_documentations_catatan_check",
      sql`${table.catatan} is null or length(${table.catatan}) <= 2000`,
    ),
  ],
);

export type PgProjectDocumentation = typeof projectDocumentations.$inferSelect;
export type NewPgProjectDocumentation = typeof projectDocumentations.$inferInsert;

// ---------------------------------------------------------------------------
// Berkas (P4 foundation): one signed PDF submission with a frozen cover.
//
// The parent owns the immutable original PDF and the generated PDF produced
// once after Validator 2 signs. Children keep signer snapshots so the cover
// never changes when a user later edits their name/position. User references
// use NO ACTION: a user who signed a document must not be silently deleted.
// Child rows cascade with their parent. Status is text + CHECK (the project
// convention) and only moves forward; the service enforces transitions.
// ---------------------------------------------------------------------------

export const berkasPengajuan = pgTable(
  "berkas_pengajuan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    judul: text("judul").notNull(),
    kodeSeri: text("kode_seri"),
    catatan: text("catatan"),
    rejectionReason: text("rejection_reason"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectedBy: uuid("rejected_by").references(() => users.id, {
      onDelete: "no action",
    }),
    revisionCount: integer("revision_count").notNull().default(0),
    pemohonId: uuid("pemohon_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    originalPdfPathname: text("original_pdf_pathname").notNull(),
    originalPdfName: text("original_pdf_name").notNull(),
    originalPdfMimeType: text("original_pdf_mime_type")
      .notNull()
      .default("application/pdf"),
    originalPdfSizeBytes: bigint("original_pdf_size_bytes", { mode: "number" }).notNull(),
    originalPdfPageCount: integer("original_pdf_page_count").notNull(),
    generatedPdfPathname: text("generated_pdf_pathname"),
    generatedPdfSizeBytes: bigint("generated_pdf_size_bytes", { mode: "number" }),
    status: text("status").$type<BerkasStatus>().notNull().default("MENUNGGU_TTD_1"),
    version: integer("version").notNull().default(1),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("berkas_pengajuan_original_pdf_pathname_unique").on(
      table.originalPdfPathname,
    ),
    uniqueIndex("berkas_pengajuan_generated_pdf_pathname_unique")
      .on(table.generatedPdfPathname)
      .where(sql`${table.generatedPdfPathname} is not null`),
    uniqueIndex("berkas_pengajuan_kode_seri_unique")
      .on(table.kodeSeri)
      .where(sql`${table.kodeSeri} is not null`),
    index("berkas_pengajuan_pemohon_created_idx").on(table.pemohonId, table.createdAt),
    index("berkas_pengajuan_status_created_idx").on(table.status, table.createdAt),
    // Search uses ILIKE '%...%' on these columns; pg_trgm is enabled in 0004.
    index("berkas_pengajuan_judul_trgm_idx").using(
      "gin",
      sql`${table.judul} gin_trgm_ops`,
    ),
    index("berkas_pengajuan_kode_seri_trgm_idx").using(
      "gin",
      sql`${table.kodeSeri} gin_trgm_ops`,
    ),
    check(
      "berkas_pengajuan_judul_check",
      sql`length(btrim(${table.judul})) between 1 and 200`,
    ),
    check(
      "berkas_pengajuan_catatan_check",
      sql`${table.catatan} is null or length(${table.catatan}) <= 2000`,
    ),
    check(
      "berkas_pengajuan_kode_seri_check",
      sql`${table.kodeSeri} is null or length(btrim(${table.kodeSeri})) between 1 and 100`,
    ),
    check(
      "berkas_pengajuan_original_pdf_name_check",
      sql`length(btrim(${table.originalPdfName})) between 1 and 255`,
    ),
    check(
      "berkas_pengajuan_original_pdf_mime_type_check",
      sql`${table.originalPdfMimeType} = 'application/pdf'`,
    ),
    check(
      "berkas_pengajuan_original_pdf_size_check",
      sql`${table.originalPdfSizeBytes} between 1 and 20971520`,
    ),
    check(
      "berkas_pengajuan_original_pdf_page_count_check",
      sql`${table.originalPdfPageCount} between 1 and 200`,
    ),
    check(
      "berkas_pengajuan_generated_pdf_size_check",
      sql`${table.generatedPdfSizeBytes} is null or ${table.generatedPdfSizeBytes} between 1 and 33554432`,
    ),
    check(
      "berkas_pengajuan_status_check",
      sql`${table.status} in ('MENUNGGU_TTD_1', 'MENUNGGU_TTD_2', 'SELESAI', 'DITOLAK')`,
    ),
    check("berkas_pengajuan_version_check", sql`${table.version} >= 1`),
    check(
      "berkas_pengajuan_rejection_reason_check",
      sql`${table.rejectionReason} is null or length(btrim(${table.rejectionReason})) between 1 and 2000`,
    ),
    check(
      "berkas_pengajuan_revision_count_check",
      sql`${table.revisionCount} >= 0`,
    ),
    check(
      "berkas_pengajuan_rejection_state_check",
      sql`${table.status} <> 'DITOLAK' or (${table.rejectedAt} is not null and ${table.rejectedBy} is not null and ${table.rejectionReason} is not null)`,
    ),
    check(
      "berkas_pengajuan_generated_path_check",
      sql`${table.generatedPdfPathname} is null or ${table.generatedPdfPathname} <> ${table.originalPdfPathname}`,
    ),
    check(
      "berkas_pengajuan_completion_check",
      sql`(${table.status} = 'SELESAI') = (${table.completedAt} is not null)`,
    ),
    check(
      "berkas_pengajuan_generated_state_check",
      sql`(
        (${table.status} = 'SELESAI'
          and ${table.generatedPdfPathname} is not null
          and ${table.generatedPdfSizeBytes} is not null)
        or
        (${table.status} <> 'SELESAI'
          and ${table.generatedPdfPathname} is null
          and ${table.generatedPdfSizeBytes} is null)
      )`,
    ),
  ],
);

export type PgBerkasPengajuan = typeof berkasPengajuan.$inferSelect;
export type NewPgBerkasPengajuan = typeof berkasPengajuan.$inferInsert;

export const berkasPenyusun = pgTable(
  "berkas_penyusun",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    berkasId: uuid("berkas_id")
      .notNull()
      .references(() => berkasPengajuan.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    namaSnapshot: text("nama_snapshot").notNull(),
    jabatanSnapshot: text("jabatan_snapshot").notNull(),
    urutan: integer("urutan").notNull(),
    ttdPathname: text("ttd_pathname").notNull(),
    ttdMimeType: text("ttd_mime_type").notNull(),
    ttdSizeBytes: bigint("ttd_size_bytes", { mode: "number" }).notNull(),
    ttdUploadedAt: timestamp("ttd_uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("berkas_penyusun_berkas_urutan_unique").on(table.berkasId, table.urutan),
    unique("berkas_penyusun_berkas_user_unique").on(table.berkasId, table.userId),
    unique("berkas_penyusun_ttd_pathname_unique").on(table.ttdPathname),
    index("berkas_penyusun_user_id_idx").on(table.userId),
    check(
      "berkas_penyusun_nama_snapshot_check",
      sql`length(btrim(${table.namaSnapshot})) between 1 and 150`,
    ),
    check(
      "berkas_penyusun_jabatan_snapshot_check",
      sql`length(btrim(${table.jabatanSnapshot})) between 1 and 150`,
    ),
    check("berkas_penyusun_urutan_check", sql`${table.urutan} between 1 and 4`),
    check(
      "berkas_penyusun_ttd_mime_type_check",
      sql`${table.ttdMimeType} in ('image/png', 'image/jpeg')`,
    ),
    check(
      "berkas_penyusun_ttd_size_check",
      sql`${table.ttdSizeBytes} between 1 and 2097152`,
    ),
  ],
);

export type PgBerkasPenyusun = typeof berkasPenyusun.$inferSelect;
export type NewPgBerkasPenyusun = typeof berkasPenyusun.$inferInsert;

export const berkasValidasi = pgTable(
  "berkas_validasi",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    berkasId: uuid("berkas_id")
      .notNull()
      .references(() => berkasPengajuan.id, { onDelete: "cascade" }),
    urutan: integer("urutan").notNull(),
    validatorUserId: uuid("validator_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    namaSnapshot: text("nama_snapshot").notNull(),
    jabatanSnapshot: text("jabatan_snapshot").notNull(),
    ttdPathname: text("ttd_pathname"),
    ttdMimeType: text("ttd_mime_type"),
    ttdSizeBytes: bigint("ttd_size_bytes", { mode: "number" }),
    ttdUploadedAt: timestamp("ttd_uploaded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("berkas_validasi_berkas_urutan_unique").on(table.berkasId, table.urutan),
    unique("berkas_validasi_berkas_validator_unique").on(
      table.berkasId,
      table.validatorUserId,
    ),
    uniqueIndex("berkas_validasi_ttd_pathname_unique")
      .on(table.ttdPathname)
      .where(sql`${table.ttdPathname} is not null`),
    index("berkas_validasi_validator_user_id_idx").on(table.validatorUserId),
    check("berkas_validasi_urutan_check", sql`${table.urutan} in (1, 2)`),
    check(
      "berkas_validasi_nama_snapshot_check",
      sql`length(btrim(${table.namaSnapshot})) between 1 and 150`,
    ),
    check(
      "berkas_validasi_jabatan_snapshot_check",
      sql`length(btrim(${table.jabatanSnapshot})) between 1 and 150`,
    ),
    check(
      "berkas_validasi_ttd_mime_type_check",
      sql`${table.ttdMimeType} is null or ${table.ttdMimeType} in ('image/png', 'image/jpeg')`,
    ),
    check(
      "berkas_validasi_ttd_size_check",
      sql`${table.ttdSizeBytes} is null or ${table.ttdSizeBytes} between 1 and 2097152`,
    ),
    check(
      "berkas_validasi_ttd_state_check",
      sql`(
        (${table.ttdPathname} is null
          and ${table.ttdMimeType} is null
          and ${table.ttdSizeBytes} is null
          and ${table.ttdUploadedAt} is null)
        or
        (${table.ttdPathname} is not null
          and ${table.ttdMimeType} is not null
          and ${table.ttdSizeBytes} is not null
          and ${table.ttdUploadedAt} is not null)
      )`,
    ),
  ],
);

export type PgBerkasValidasi = typeof berkasValidasi.$inferSelect;
export type NewPgBerkasValidasi = typeof berkasValidasi.$inferInsert;
