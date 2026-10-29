// Client-side contract for Struktur Organisasi.
//
// Mirrors the frozen Phase 1 service DTO exactly: the browser only ever learns
// what it must render (the public image URL, a display name, and who/when it was
// last changed). `blobPathname`, actor ids and every other database detail stay
// server-side.
//
// Pure and dependency-free so it can be imported by Client Components.

export type OrganizationStructureApiItem = {
  imageUrl: string;
  fileName: string | null;
  updatedAt: string;
  updatedByName: string | null;
};

// GET: `data: null` is the documented "belum tersedia" state, not an error.
export type OrganizationStructureApiResponse = {
  data: OrganizationStructureApiItem | null;
};

// PUT returns the saved DTO.
export type OrganizationStructureMutationResponse = {
  data: OrganizationStructureApiItem;
};

type OrganizationStructureErrorBody = {
  error?: { message?: string };
};

/**
 * Reads the server's own domain message (already user-safe and in Indonesian)
 * so the banner can explain the real cause, and falls back to a neutral
 * sentence. Never surfaces a status code, a SQLSTATE or a stack trace.
 */
export function organizationStructureErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as OrganizationStructureErrorBody).error;
    if (error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }
  return fallback;
}
