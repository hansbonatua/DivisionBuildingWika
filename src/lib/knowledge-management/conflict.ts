// Pure optimistic-concurrency helpers. Kept dependency-free so they are
// unit-testable without a database, session or Next.js runtime.
//
// V2 compares integer versions, not timestamps. A missing/invalid expected
// version is rejected at the HTTP boundary before this helper is reached.

export class KnowledgeVersionConflictError extends Error {
  readonly code = "KNOWLEDGE_VERSION_CONFLICT";

  constructor(message = "Data sudah diubah pengguna lain. Muat ulang data terbaru.") {
    super(message);
    this.name = "KnowledgeVersionConflictError";
  }
}

export function hasVersionConflict(
  currentVersion: number,
  expectedVersion: number,
): boolean {
  return currentVersion !== expectedVersion;
}
