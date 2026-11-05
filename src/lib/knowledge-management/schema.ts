import { z } from "zod";

// Knowledge Management V1 input contracts.
//
// The three submenus share one payload shape; `knowledgeType` is the only
// discriminator. Content is plain text (paragraphs, "- " bullets, "1. " numbered
// lists) — line breaks are stored verbatim, never HTML or Markdown.

export const KNOWLEDGE_TYPES = ["lesson_learn", "best_practice", "va_ve"] as const;

export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
  lesson_learn: "Lesson Learn",
  best_practice: "Best Practice / KI KM",
  va_ve: "VA/VE",
};

export const KNOWLEDGE_TYPE_SLUGS: Record<KnowledgeType, string> = {
  lesson_learn: "lesson-learn",
  best_practice: "best-practice",
  va_ve: "va-ve",
};

export function isKnowledgeType(value: string): value is KnowledgeType {
  return (KNOWLEDGE_TYPES as readonly string[]).includes(value);
}

export function knowledgeTypeFromSlug(slug: string): KnowledgeType | null {
  const match = KNOWLEDGE_TYPES.find((type) => KNOWLEDGE_TYPE_SLUGS[type] === slug);
  return match ?? null;
}

// Evidence URLs are validated on the SERVER (this module is imported by route
// handlers and services, never by the browser as the authority). Only absolute
// http/https URLs are accepted: javascript:, data:, file:, blob:, protocol
// relative ("//host") and bare hostnames ("example.com") are all rejected.
export function isSafeEvidenceUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

const evidenceUrlField = z
  .string()
  .trim()
  .min(1, "URL evidence wajib diisi")
  .max(2048, "URL evidence maksimal 2048 karakter")
  .refine(isSafeEvidenceUrl, {
    message: "URL evidence harus diawali http:// atau https://",
  });

const evidenceNameField = z
  .string()
  .trim()
  .min(1, "Nama evidence wajib diisi")
  .max(200, "Nama evidence maksimal 200 karakter");

export const evidenceItemSchema = z
  .object({
    name: evidenceNameField,
    url: evidenceUrlField,
  })
  .strict();

export type EvidenceItemInput = z.infer<typeof evidenceItemSchema>;

const contentField = z
  .string()
  .trim()
  .min(1, "Isi knowledge wajib diisi")
  .max(20000, "Isi knowledge maksimal 20000 karakter");

// PIC is mandatory in V1: a knowledge record always has at least one Head
// Office assignee. Duplicates are removed by the service, not here.
const picIdListField = z
  .array(z.uuid("PIC tidak valid"))
  .min(1, "Minimal 1 PIC")
  .max(50, "Maksimal 50 PIC per baris");

// Optimistic-concurrency token (KM-03). The client echoes the `updatedAt` it
// last received for this record, or null when it believes no record exists yet.
// The server compares it inside the transaction; a mismatch means someone else
// saved first and the write is rejected with 409.
const expectedUpdatedAtField = z
  .string()
  .trim()
  .min(1, "expectedUpdatedAt tidak valid")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "expectedUpdatedAt tidak valid",
  })
  .nullable()
  .optional();

// Inline record payload for one (project, knowledge type): content + PIC only.
// Evidence is NOT part of this contract — it is managed per row through the
// dedicated evidence endpoints, so saving content/PIC can never add, edit or
// remove evidence (and vice versa).
export const upsertKnowledgeEntrySchema = z
  .object({
    projectId: z.uuid("Project tidak valid"),
    knowledgeType: z.enum(KNOWLEDGE_TYPES),
    content: contentField,
    // Required with no default (KM-01): an omitted list is never read as
    // "clear every PIC". The business rule also demands at least one PIC.
    picIds: picIdListField,
    expectedUpdatedAt: expectedUpdatedAtField,
  })
  .strict();

// One Evidence row (add / edit). Name and URL are both required; the URL is
// restricted to absolute http(s) and rendered as a plain hyperlink.
export const evidencePayloadSchema = evidenceItemSchema;

export type UpsertKnowledgeEntryInput = z.infer<typeof upsertKnowledgeEntrySchema>;

export const knowledgeTypeQuerySchema = z.object({
  type: z.enum(KNOWLEDGE_TYPES, "Tipe knowledge tidak valid"),
});
