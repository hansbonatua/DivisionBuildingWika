// Pure optimistic-concurrency comparison (KM-03). Kept dependency-free so it is
// unit-testable without a database, session or Next.js runtime.
//
// `currentUpdatedAt` is the exact timestamp token read inside the transaction:
// a UTC string with microsecond precision produced by PostgreSQL, never a
// JavaScript Date. The expected token is the same string the client received,
// or null when the client believes no record exists yet.
//
// Tokens are compared as exact strings. This keeps the full PostgreSQL
// precision, so two writes inside the same millisecond still have distinct
// tokens and the second one is rejected. A missing or different token is stale.
export function hasStaleTimestamp(
  currentUpdatedAt: string,
  expectedUpdatedAt: string | null,
): boolean {
  if (expectedUpdatedAt === null) {
    return true;
  }
  return currentUpdatedAt !== expectedUpdatedAt;
}
