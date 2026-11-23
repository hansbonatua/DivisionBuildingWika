// Domain constants for Building Learning Center (BLC).
//
// Pure and dependency-free so the same values feed Zod, the API, the database
// CHECK constraints (kept in sync manually, as in the other modules) and — in
// P4 Sub-fase 2 — the sidebar/route labels. `type` never includes "admin":
// Admin Control is a page, not a fourth content type.

export const LEARNING_CONTENT_TYPES = [
  "sharing",
  "training",
  "certificate",
] as const;

export type LearningContentType = (typeof LEARNING_CONTENT_TYPES)[number];

export const LEARNING_CONTENT_TYPE_LABELS: Record<LearningContentType, string> =
  {
    sharing: "Sharing Session",
    training: "Training",
    certificate: "Certificate",
  };

export const LEARNING_TITLE_MAX_LENGTH = 200;
export const LEARNING_DESCRIPTION_MAX_LENGTH = 2000;
export const LEARNING_CATEGORY_NAME_MAX_LENGTH = 80;
export const LEARNING_URL_MAX_LENGTH = 2048;

// Card-grid page size. Fixed (not client-controlled) so the payload stays
// bounded and the grid layout is stable.
export const LEARNING_PAGE_SIZE = 24;

export const LEARNING_MAX_ATTACHMENTS = 20;

// Sort orders are spaced by 10 so a future drag-and-drop reorder can write
// 10, 20, 30, … without rewriting neighbours.
export const LEARNING_SORT_STEP = 10;

export function isLearningContentType(
  value: string,
): value is LearningContentType {
  return (LEARNING_CONTENT_TYPES as readonly string[]).includes(value);
}
