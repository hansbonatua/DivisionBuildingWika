import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import { users, type NewPgUser, type PgUser } from "@/lib/pg/schema";

// Server-only: minimal PostgreSQL Users read-path for authentication.
// No User Control CRUD here (create/update/delete/suspend belong to a later phase).
// No MongoDB. No mock users.

export type { PgUser, NewPgUser };

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
