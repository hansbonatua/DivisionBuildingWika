import { asc, eq, sql } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import { users, type NewPgUser, type PgUser } from "@/lib/pg/schema";

// Server-only: PostgreSQL Users read-path (auth + User Control list/detail).
// No writes here yet (create/update/delete/suspend belong to a later phase).
// No MongoDB. No mock users.

export type { PgUser, NewPgUser };

export async function listUsers(): Promise<PgUser[]> {
  const db = getPgDb();
  return db.select().from(users).orderBy(asc(users.name));
}

export async function findUserByEmail(email: string): Promise<PgUser | null> {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }
  const db = getPgDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, normalized))
    .limit(1);
  return rows[0] ?? null;
}

function normalizeNip(nip: string): string {
  return nip.trim();
}

export async function findUserByNip(nip: string): Promise<PgUser | null> {
  const normalized = normalizeNip(nip);
  if (normalized.length === 0) {
    return null;
  }
  const db = getPgDb();
  const rows = await db.select().from(users).where(eq(users.nip, normalized)).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<PgUser | null> {
  if (id.trim().length === 0) {
    return null;
  }
  const db = getPgDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(data: NewPgUser): Promise<PgUser> {
  const db = getPgDb();
  const rows = await db.insert(users).values(data).returning();
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create user");
  }
  return created;
}

export async function updateUser(id: string, data: Partial<NewPgUser>): Promise<PgUser | null> {
  const db = getPgDb();
  const rows = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return rows[0] ?? null;
}
