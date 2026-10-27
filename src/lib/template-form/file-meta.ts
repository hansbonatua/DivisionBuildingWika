import { templateFormFileExtension } from "@/lib/template-form/source";

// Display-only helpers for Template & Form. Pure and dependency-free so both
// Client Components (editor, table) and server code can use them.
//
// They never decide security: the approved extension allowlist lives in
// source.ts and is enforced server-side. These helpers only label and format
// already-approved data for the UI.

export type TemplateFormFileKind =
  | "link"
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "file";

const KIND_LABELS: Record<TemplateFormFileKind, string> = {
  link: "Link",
  pdf: "PDF",
  word: "Word",
  excel: "Excel",
  powerpoint: "PowerPoint",
  file: "File",
};

/** Readable document type for a stored display file name. */
export function templateFormFileKind(
  fileName: string | null | undefined,
): TemplateFormFileKind {
  if (typeof fileName !== "string" || fileName.trim() === "") {
    return "file";
  }
  switch (templateFormFileExtension(fileName)) {
    case ".pdf":
      return "pdf";
    case ".doc":
    case ".docx":
      return "word";
    case ".xls":
    case ".xlsx":
      return "excel";
    case ".ppt":
    case ".pptx":
      return "powerpoint";
    default:
      return "file";
  }
}

export function templateFormFileKindLabel(kind: TemplateFormFileKind): string {
  return KIND_LABELS[kind];
}

function oneDecimal(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/**
 * Human-readable size: KB below 1 MB, MB above, never raw bytes.
 * Returns null for a missing or non-positive value so callers can omit the line.
 */
export function formatTemplateFormFileSize(
  bytes: number | null | undefined,
): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes < 10 ? oneDecimal(kilobytes) : Math.round(kilobytes)} KB`;
  }
  const megabytes = kilobytes / 1024;
  return `${megabytes < 100 ? oneDecimal(megabytes) : Math.round(megabytes)} MB`;
}
