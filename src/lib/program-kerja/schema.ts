import { z } from "zod";

// Program Kerja input contracts (Kelola phase). year is create-only and
// never appears in the update contract (immutable after create). RI, note
// and evidenceUrl travel through dedicated contracts, not master edit.

// Single source of truth for units. Matches the DB CHECK constraint.
export const PROGRAM_KERJA_UNITS = ["Jumlah", "Persentase"] as const;

export type ProgramKerjaUnit = (typeof PROGRAM_KERJA_UNITS)[number];

const programKerjaUnit = z.enum(PROGRAM_KERJA_UNITS);

const monthlyRaValues = z.array(z.number().int().min(0)).length(12);

export const createProgramKerjaSchema = z.discriminatedUnion("unit", [
  z.object({
    unit: z.literal("Persentase"),
    groupId: z.string().trim().min(1, "Kelompok wajib diisi"),
    year: z.number().int().min(2000, "Tahun minimal 2000"),
    name: z.string().trim().min(1, "Nama wajib diisi").max(200),
    description: z.string().trim().min(1, "Deskripsi wajib diisi").max(5000),
    startMonth: z.number().int().min(1).max(12),
    endMonth: z.number().int().min(1).max(12),
    parameter: z.string().trim().min(1, "Parameter wajib diisi").max(200),
    monitor: z.string().trim().max(500).optional(),
    picIds: z.array(z.string().trim().min(1)).min(1, "Minimal 1 PIC"),
    raPercentage: z.number().min(0, "RA minimal 0").max(100, "RA maksimal 100"),
  }),
  z.object({
    unit: z.literal("Jumlah"),
    groupId: z.string().trim().min(1, "Kelompok wajib diisi"),
    year: z.number().int().min(2000, "Tahun minimal 2000"),
    name: z.string().trim().min(1, "Nama wajib diisi").max(200),
    description: z.string().trim().min(1, "Deskripsi wajib diisi").max(5000),
    startMonth: z.number().int().min(1).max(12),
    endMonth: z.number().int().min(1).max(12),
    parameter: z.string().trim().min(1, "Parameter wajib diisi").max(200),
    monitor: z.string().trim().max(500).optional(),
    picIds: z.array(z.string().trim().min(1)).min(1, "Minimal 1 PIC"),
    monthlyRa: monthlyRaValues,
  }),
]);

export type CreateProgramKerjaInput = z.infer<typeof createProgramKerjaSchema>;

// Master edit contract. No year (immutable), no RI, no note, no
// evidenceUrl, no createdBy. Strict: unknown keys (e.g. year) are REJECTED,
// never silently stripped — an immutable field in the payload is a client
// error, not a no-op. RA fields are optional unless the unit changes — the
// service enforces that requirement explicitly.
export const updateProgramMasterSchema = z
  .object({
    groupId: z.string().trim().min(1, "Kelompok wajib diisi").optional(),
    name: z.string().trim().min(1, "Nama wajib diisi").max(200).optional(),
    description: z.string().trim().min(1, "Deskripsi wajib diisi").max(5000).optional(),
    startMonth: z.number().int().min(1).max(12).optional(),
    endMonth: z.number().int().min(1).max(12).optional(),
    parameter: z.string().trim().min(1, "Parameter wajib diisi").max(200).optional(),
    unit: programKerjaUnit.optional(),
    monitor: z.string().trim().max(500).nullable().optional(),
    picIds: z.array(z.string().trim().min(1)).min(1, "Minimal 1 PIC").optional(),
    raPercentage: z.number().min(0, "RA minimal 0").max(100, "RA maksimal 100").optional(),
    monthlyRa: monthlyRaValues.optional(),
  })
  .strict();

export type UpdateProgramMasterInput = z.infer<typeof updateProgramMasterSchema>;

export const updateProgramRiSchema = z.object({
  month: z.number().int().min(1, "Bulan 1–12").max(12, "Bulan 1–12"),
  ri: z.number().min(0, "RI minimal 0"),
});

export type UpdateProgramRiInput = z.infer<typeof updateProgramRiSchema>;

export const updateProgramNoteSchema = z.object({
  note: z.string().trim().max(10000),
});

export type UpdateProgramNoteInput = z.infer<typeof updateProgramNoteSchema>;

export const updateProgramEvidenceSchema = z.object({
  evidenceUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
      message: "URL evidence harus http(s)",
    }),
});

export type UpdateProgramEvidenceInput = z.infer<typeof updateProgramEvidenceSchema>;
