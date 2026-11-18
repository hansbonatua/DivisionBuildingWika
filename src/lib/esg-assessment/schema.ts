import { z } from "zod";
import { GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH } from "@/lib/green-building-esg/constants";
import { ESG_MONTH_STATUSES } from "@/lib/esg-assessment/constants";

// Input contracts for Penilaian ESG. Bodies use snake_case to match the public
// API; `id`, `year`, audit fields, and project metadata are rejected by
// `.strict()` — `year` is always a server-side snapshot of the Master Project.

function isHttpDocumentationUrl(value: string): boolean {
  if (value.length === 0) return false;
  if (value.length > GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH) return false;
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const projectIdField = z.uuid("Project tidak valid");

const documentationUrlField = z
  .string()
  .trim()
  .max(
    GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH,
    `Dokumentasi maksimal ${GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH} karakter`,
  )
  .nullable()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || isHttpDocumentationUrl(value),
    "Dokumentasi harus berupa URL http(s) tanpa spasi",
  );

export const createProjectEsgAssessmentSchema = z
  .object({
    project_id: projectIdField,
    documentation_url: documentationUrlField,
  })
  .strict();

export type CreateProjectEsgAssessmentInput = z.infer<
  typeof createProjectEsgAssessmentSchema
>;

// PUT receives the same payload as POST: project and documentation only. The
// twelve month statuses are never part of it — they change through PATCH.
export const updateProjectEsgAssessmentSchema = createProjectEsgAssessmentSchema;

export type UpdateProjectEsgAssessmentInput = z.infer<
  typeof updateProjectEsgAssessmentSchema
>;

// `status: null` clears the cell; only Complete/Half are accepted otherwise.
export const esgMonthStatusField = z
  .enum(ESG_MONTH_STATUSES, "Status harus Complete atau Half")
  .nullable();

export const patchProjectEsgMonthSchema = z
  .object({ status: esgMonthStatusField })
  .strict();

export type PatchProjectEsgMonthInput = z.infer<
  typeof patchProjectEsgMonthSchema
>;

export const esgAssessmentListQuerySchema = z.object({
  year: z.coerce
    .number("Tahun harus berupa angka")
    .int("Tahun harus berupa bilangan bulat")
    .min(2000, "Tahun minimal 2000")
    .max(2100, "Tahun maksimal 2100")
    .optional(),
  search: z
    .string()
    .trim()
    .max(200, "Pencarian maksimal 200 karakter")
    .optional(),
});

export type EsgAssessmentListQuery = z.infer<
  typeof esgAssessmentListQuerySchema
>;
