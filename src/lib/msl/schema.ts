import { z } from "zod";

// MSL Engineering input contracts (foundation).
//
// Only reusable validation shapes live here — no repository, no service, no
// routes yet. Conventions mirror @/lib/engineering-database/schema: UUID fields
// are validated with z.uuid, identity/derived fields are REJECTED by .strict()
// rather than silently stripped, and numeric scoring inputs stay `number`
// (never numeric strings) because the API contract speaks JSON numbers.

// Remarks is optional free text on the assessment. 2000 chars matches the
// existing "note" ceiling used across the enterprise modules and keeps the
// text safely printable inside a future MSL PDF. An empty/whitespace-only
// input is normalized to NULL so "no remarks" has one representation.
export const MSL_REMARKS_MAX_LENGTH = 2000;

const projectIdField = z.uuid("Project tidak valid");

function hasAtMostTwoDecimals(value: number): boolean {
  // 1.234 * 100 = 123.4 -> rejected. 4.99 * 100 = 499.00000000000006 -> the
  // sub-epsilon delta is accepted, so the check is stable for real input while
  // still rejecting a genuine third decimal.
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

const scoreComponentField = (label: string) =>
  z
    .number(`${label} wajib berupa angka`)
    .min(1, `${label} minimal 1`)
    .max(5, `${label} maksimal 5`)
    .refine(hasAtMostTwoDecimals, `${label} maksimal 2 angka desimal`);

const remarksField = z
  .string()
  .trim()
  .max(MSL_REMARKS_MAX_LENGTH, `Remarks maksimal ${MSL_REMARKS_MAX_LENGTH} karakter`)
  .transform((value) => (value.length === 0 ? null : value));

// Create: project + three components + optional remarks. Every other column
// (id, createdBy/updatedBy, timestamps, score, category) is server-owned and
// therefore not part of the contract.
export const createMslAssessmentSchema = z
  .object({
    projectId: projectIdField,
    engineeringValue: scoreComponentField("Engineering Value"),
    metodeKerja: scoreComponentField("Metode Kerja"),
    engineeringExecution: scoreComponentField("Engineering Execution"),
    remarks: remarksField.optional(),
  })
  .strict();

export type CreateMslAssessmentInput = z.infer<typeof createMslAssessmentSchema>;

// Update: scoring fields and remarks only. projectId is intentionally ABSENT —
// an assessment describes one project and cannot be moved to another. Passing
// projectId is rejected (strict), not ignored.
export const updateMslAssessmentSchema = z
  .object({
    engineeringValue: scoreComponentField("Engineering Value").optional(),
    metodeKerja: scoreComponentField("Metode Kerja").optional(),
    engineeringExecution: scoreComponentField("Engineering Execution").optional(),
    remarks: remarksField.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type UpdateMslAssessmentInput = z.infer<typeof updateMslAssessmentSchema>;

// Annual note: one per year for the whole MSL picture. `note` nullable so
// "never written" stays distinguishable from a written-but-empty text; an
// explicit empty string is normalized to NULL.
export const mslYearNoteSchema = z
  .object({
    // Mirrors the database contract exactly (msl_year_notes_year_check):
    // integer, >= 2000, no upper bound. The application must not introduce a
    // maximum year the database and Master Project never defined.
    year: z
      .number("Tahun wajib berupa angka")
      .int("Tahun harus bilangan bulat")
      .min(2000, "Tahun minimal 2000"),
    note: z
      .string()
      .trim()
      .max(MSL_REMARKS_MAX_LENGTH, `Catatan maksimal ${MSL_REMARKS_MAX_LENGTH} karakter`)
      .transform((value) => (value.length === 0 ? null : value))
      .nullable()
      .optional(),
  })
  .strict();

export type MslYearNoteInput = z.infer<typeof mslYearNoteSchema>;
