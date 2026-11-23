// Shared client-side types for Building Learning Center.
//
// Every API payload is validated before it reaches React state: a malformed or
// partial response must not crash the grid, and the same guards are reused by
// the admin table and the edit dialog.

export type LearningContentType = "sharing" | "training" | "certificate";

export type LearningCategory = {
  id: string;
  nama: string;
  sort_order: number;
  content_count: number;
};

export type LearningAttachment = {
  id: string;
  nama: string;
  file_name: string;
  file_mime_type: string;
  file_size_bytes: number;
  sort_order: number;
};

export type LearningContentListItem = {
  id: string;
  type: LearningContentType;
  judul: string;
  deskripsi: string | null;
  kategori: { id: string; nama: string };
  thumbnail_url: string;
  external_url: string | null;
  sort_order: number;
  attachment_count: number;
  created_at: string;
  updated_at: string;
};

export type LearningContentDetail = LearningContentListItem & {
  video_embed_url: string | null;
  attachments: LearningAttachment[];
};

export type LearningContentDialogState =
  | { mode: "create"; type: LearningContentType }
  | { mode: "edit"; type: LearningContentType; record: LearningContentDetail };

export const LEARNING_TYPE_LABELS: Record<LearningContentType, string> = {
  sharing: "Sharing Session",
  training: "Training",
  certificate: "Certificate",
};

export function isLearningContentType(
  value: unknown,
): value is LearningContentType {
  return (
    value === "sharing" || value === "training" || value === "certificate"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function isLearningCategory(value: unknown): value is LearningCategory {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.nama) &&
    typeof value.sort_order === "number" &&
    typeof value.content_count === "number"
  );
}

export function isLearningAttachment(
  value: unknown,
): value is LearningAttachment {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.nama) &&
    isNonEmptyString(value.file_name) &&
    typeof value.file_size_bytes === "number"
  );
}

export function isLearningContentListItem(
  value: unknown,
): value is LearningContentListItem {
  if (!isRecord(value)) return false;
  const kategori = value.kategori;
  return (
    isNonEmptyString(value.id) &&
    isLearningContentType(value.type) &&
    isNonEmptyString(value.judul) &&
    isRecord(kategori) &&
    isNonEmptyString(kategori.id) &&
    isNonEmptyString(kategori.nama) &&
    typeof value.thumbnail_url === "string" &&
    (value.external_url === null || typeof value.external_url === "string") &&
    typeof value.attachment_count === "number"
  );
}

export function isLearningContentDetail(
  value: unknown,
): value is LearningContentDetail {
  if (!isLearningContentListItem(value)) return false;
  const attachments = (value as Record<string, unknown>).attachments;
  return (
    ((value as Record<string, unknown>).video_embed_url === null ||
      typeof (value as Record<string, unknown>).video_embed_url === "string") &&
    Array.isArray(attachments) &&
    attachments.every(isLearningAttachment)
  );
}

export function formatLearningFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes < 10 ? kilobytes.toFixed(1) : Math.round(kilobytes)} KB`;
  }
  const megabytes = kilobytes / 1024;
  return `${megabytes < 100 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`;
}

export function learningFileTypeLabel(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return "FILE";
  return trimmed.slice(lastDot + 1).toUpperCase();
}
