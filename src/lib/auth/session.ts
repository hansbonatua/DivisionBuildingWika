import { createHash, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import { sessions, type PgSession } from "@/lib/pg/schema";

// Server-only: opaque database-backed session logic.
// Cookie stores the RAW token; PostgreSQL stores only its SHA-256 hash.
// Never store or log raw session tokens in the database.

export const SESSION_COOKIE_NAME = "wibex_session";

export const SESSION_DURATION_SECONDS = 24 * 60 * 60;
export const REMEMBER_SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiryFromNow(remember: boolean): Date {
  const seconds = remember ? REMEMBER_SESSION_DURATION_SECONDS : SESSION_DURATION_SECONDS;
  return new Date(Date.now() + seconds * 1000);
}

export function sessionMaxAge(remember: boolean): number {
  return remember ? REMEMBER_SESSION_DURATION_SECONDS : SESSION_DURATION_SECONDS;
}

export async function createSession(userId: string, remember: boolean): Promise<{
  token: string;
  session: PgSession;
}> {
  const token = randomBytes(32).toString("hex");
  const db = getPgDb();
  const rows = await db
    .insert(sessions)
    .values({
      tokenHash: hashToken(token),
      userId,
      expiresAt: sessionExpiryFromNow(remember),
    })
    .returning();
  const session = rows[0];
  if (!session) {
    throw new Error("Failed to create session");
  }
  return { token, session };
}

export async function findSessionByToken(token: string): Promise<PgSession | null> {
  if (token.length === 0) {
    return null;
  }
  const db = getPgDb();
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);
  const session = rows[0] ?? null;
  if (!session) {
    return null;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteSessionById(session.id);
    return null;
  }
  return session;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  if (token.length === 0) {
    return;
  }
  const db = getPgDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function deleteSessionById(id: string): Promise<void> {
  const db = getPgDb();
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function deleteExpiredSessions(now: Date = new Date()): Promise<void> {
  const db = getPgDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const db = getPgDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
