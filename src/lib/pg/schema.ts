import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
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

export const templateForms = pgTable(
  "template_forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    fileUrl: text("file_url").notNull(),
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
    index("template_forms_uploader_pic_user_id_idx").on(table.uploaderPicUserId),
    index("template_forms_created_by_idx").on(table.createdBy),
  ],
);

export type PgTemplateForm = typeof templateForms.$inferSelect;
export type NewPgTemplateForm = typeof templateForms.$inferInsert;
