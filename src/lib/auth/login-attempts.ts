import { createHash } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import { loginAttempts } from "@/lib/pg/schema";

// Server-only: login attempt ledger + V1 temporary lockout policy.
//
// Policy (V1):
//   5 failed attempts for the SAME identity inside a 15 minute window
//   → login is refused with 429 until the window releases the failures.
//   The lock is never permanent: once the oldest counted failure ages out of
//   the window the identity is allowed to try again.
//
// The window IS the state. There is no lock flag, no counter column and no
// background job: "locked" is derived from the recent failure rows, so it can
// never drift out of sync with reality and a restart changes nothing.
//
// Identity privacy: the NIP is hashed with SHA-256 before it is written. The
// ledger therefore holds no raw employee number, and no password, password
// hash, session token or IP address is stored at all.
//
// Identities are keyed on NIP only. An IP dimension is deliberately absent:
// an attacker can rotate source IPs, but they cannot rotate the NIP they are
// trying to break into, so the NIP is the control that actually matters here.

export const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCKOUT_THRESHOLD = 5;

// Upper bound for the single window scan. The streak logic below only needs
// the newest rows, so a pathological identity can never make this expensive.
const LOGIN_ATTEMPT_SCAN_LIMIT = 200;

// One generic message for every locked identity: it says nothing about whether
// the account exists, is suspended or has any other property.
export const LOGIN_LOCKOUT_MESSAGE =
  "Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.";

export type LoginThrottleState =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

/**
 * Stable ledger identity for a NIP. Trimmed, then SHA-256 (lowercase hex), so
 * the same input always maps to the same row and the raw NIP is never stored.
 */
export function hashLoginIdentity(nip: string): string {
  return createHash("sha256").update(nip.trim()).digest("hex");
}

/**
 * Appends one credential outcome. Never updates or deletes existing rows, so
 * the trail stays append-only.
 *
 * Failures are only written while an identity is NOT locked (the route returns
 * 429 before verification), which is what keeps the table bounded during a
 * guessing run.
 */
export async function recordLoginAttempt(
  nip: string,
  succeeded: boolean,
): Promise<void> {
  const db = getPgDb();
  await db.insert(loginAttempts).values({
    identityHash: hashLoginIdentity(nip),
    succeeded,
  });
}

/**
 * Evaluates the lockout for an identity in ONE round trip.
 *
 * The window scan is ordered newest-first and stopped at the last success, so a
 * successful login neutralizes every older failure without deleting anything
 * from the audit trail. Everything older than that success (and everything
 * outside the 15 minute window) is irrelevant to the streak.
 *
 * Unlock time: with C failures in the window, the identity unlocks when C-4 of
 * them have expired, i.e. when the (C-4)-th OLDEST failure leaves the window —
 * which is exactly the 5th NEWEST failure. That row is `fifthNewestFailure`
 * below, so the computation stays correct without ever knowing C.
 */
export async function evaluateLoginThrottle(
  nip: string,
  now: Date = new Date(),
): Promise<LoginThrottleState> {
  const identityHash = hashLoginIdentity(nip);
  const db = getPgDb();
  const windowStart = new Date(now.getTime() - LOGIN_LOCKOUT_WINDOW_MS);

  // Served by login_attempts_identity_hash_succeeded_created_at_idx.
  const rows = await db
    .select({
      succeeded: loginAttempts.succeeded,
      createdAt: loginAttempts.createdAt,
    })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identityHash, identityHash),
        gte(loginAttempts.createdAt, windowStart),
      ),
    )
    .orderBy(desc(loginAttempts.createdAt))
    .limit(LOGIN_ATTEMPT_SCAN_LIMIT);

  let streak = 0;
  let fifthNewestFailure: Date | null = null;
  for (const row of rows) {
    // Newest-first: the first success ends the current streak.
    if (row.succeeded) {
      break;
    }
    streak += 1;
    fifthNewestFailure = row.createdAt;
    if (streak >= LOGIN_LOCKOUT_THRESHOLD) {
      break;
    }
  }

  if (streak < LOGIN_LOCKOUT_THRESHOLD || fifthNewestFailure === null) {
    return { locked: false };
  }

  const unlocksAt = fifthNewestFailure.getTime() + LOGIN_LOCKOUT_WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((unlocksAt - now.getTime()) / 1000));

  return { locked: true, retryAfterSeconds };
}
