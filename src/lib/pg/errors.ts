// Shared PostgreSQL error classification for services/repositories.
//
// Drizzle wraps driver errors (DrizzleQueryError), so the SQLSTATE usually lives
// on the nested `cause` chain instead of the top-level error — reading
// `error.code` alone misses it.
//
// NOTE: Master Project and Engineering Databases already carry private copies of
// this logical helper (frozen V1 modules, deliberately not touched here). New
// code should import this module so the classifier stops multiplying; the two
// older copies can be pointed at it during a later housekeeping pass.

// PostgreSQL codes meaning "a referenced row cannot be removed":
//   23503 = foreign_key_violation (NO ACTION)
//   23001 = restrict_violation (ON DELETE RESTRICT)
const ROW_REFERENCED_CODES = new Set(["23503", "23001"]);

export function isForeignKeyViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && ROW_REFERENCED_CODES.has(code)) {
    return true;
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : isForeignKeyViolation(cause, depth + 1);
}
