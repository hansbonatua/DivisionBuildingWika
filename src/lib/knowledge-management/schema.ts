import { z } from "zod";

// Knowledge Management V2 input contracts.
//
// The three submenus share one create/update payload shape. `knowledge_type`
// comes from the route query on create; it is never accepted in the PUT body.
// Content is plain text (paragraphs, bullets, numbered lists); line breaks are
// stored verbatim and never rendered as HTML/Markdown.

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

// Only absolute http/https URLs are accepted. javascript:, data:, file:, blob:,
// protocol-relative and bare-host values are rejected by the server.
export function isSafeEvidenceUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

const contentField = z
  .string()
  .trim()
  .min(1, "Isi knowledge wajib diisi")
  .max(20000, "Isi knowledge maksimal 20.000 karakter");

const picIdListField = z
  .array(z.uuid("PIC tidak valid"))
  .min(1, "Minimal 1 PIC");

const evidenceNameField = z
  .string()
  .trim()
  .min(1, "Nama evidence wajib diisi")
  .max(200, "Nama evidence maksimal 200 karakter");

const evidenceUrlField = z
  .string()
  .trim()
  .min(1, "URL evidence wajib diisi")
  .max(2048, "URL evidence maksimal 2.048 karakter")
  .refine(isSafeEvidenceUrl, {
    message: "URL evidence harus diawali http:// atau https://",
  });

const expectedVersionField = z
  .number()
  .int("expected_version harus berupa bilangan bulat")
  .min(1, "expected_version minimal 1");

// Evidence is one pair per record in V2. The dedicated V1 per-row evidence
// contract is retained only for the remaining V1 route until Sub-Fase C.
export const evidenceItemSchema = z
  .object({
    name: evidenceNameField,
    url: evidenceUrlField,
  })
  .strict();

export type EvidenceItemInput = z.infer<typeof evidenceItemSchema>;

export const createKnowledgeEntrySchema = z
  .object({
    project_id: z.uuid("Project tidak valid"),
    content: contentField,
    pic_ids: picIdListField,
    evidence_name: evidenceNameField,
    evidence_url: evidenceUrlField,
  })
  .strict();

export type CreateKnowledgeEntryInput = z.infer<typeof createKnowledgeEntrySchema>;

export const updateKnowledgeEntrySchema = z
  .object({
    content: contentField,
    pic_ids: picIdListField,
    evidence_name: evidenceNameField,
    evidence_url: evidenceUrlField,
    expected_version: expectedVersionField,
  })
  .strict();

export type UpdateKnowledgeEntryInput = z.infer<typeof updateKnowledgeEntrySchema>;

export const knowledgeTypeQuerySchema = z.object({
  type: z.enum(KNOWLEDGE_TYPES, "Tipe knowledge tidak valid"),
});
