import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
