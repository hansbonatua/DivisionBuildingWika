import { z } from "zod";
import {
  GREEN_BUILDING_DOCUMENTATION_MAX_LENGTH,
  GREEN_BUILDING_LEMBAGA,
  GREEN_BUILDING_LEVELS,
  GREEN_BUILDING_LEVELS_BY_LEMBAGA,
  GREEN_BUILDING_STATUSES,
} from "@/lib/green-building-esg/constants";

// Input contracts for Sertifikasi Green Building. The body uses snake_case to
// match the public API, while repository/service internals use camelCase.
// Audit fields, id, and project_name are rejected by `.strict()`.

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

const projectValueField = z
  .string()
  .trim()
  .min(1, "Nilai proyek wajib diisi")
  .max(100, "Nilai proyek maksimal 100 karakter");

const locationField = z
  .string()
  .trim()
  .min(1, "Lokasi wajib diisi")
  .max(200, "Lokasi maksimal 200 karakter");

const certificateYearField = z
  .number("Tahun sertifikat harus berupa angka")
  .int("Tahun sertifikat harus berupa bilangan bulat")
  .min(2000, "Tahun sertifikat minimal 2000")
  .max(2100, "Tahun sertifikat maksimal 2100");

const lembagaField = z.enum(GREEN_BUILDING_LEMBAGA, "Lembaga tidak valid");
const levelField = z.enum(GREEN_BUILDING_LEVELS, "Level tidak valid");
const statusField = z.enum(GREEN_BUILDING_STATUSES, "Status tidak valid");

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

export const createProjectGreenCertificateSchema = z
  .object({
    project_id: projectIdField,
    project_value: projectValueField,
    location: locationField,
    certificate_year: certificateYearField,
    lembaga: lembagaField,
    level: levelField,
    status: statusField,
    documentation_url: documentationUrlField,
  })
  .strict()
  .superRefine((value, context) => {
    const allowedLevels = GREEN_BUILDING_LEVELS_BY_LEMBAGA[value.lembaga];
    if (!(allowedLevels as readonly string[]).includes(value.level)) {
      context.addIssue({
        code: "custom",
        path: ["level"],
        message: `Level tidak cocok untuk lembaga ${value.lembaga}`,
      });
    }
  });

export type CreateProjectGreenCertificateInput = z.infer<
  typeof createProjectGreenCertificateSchema
>;

// PUT receives the complete create payload; every domain field is editable.
export const updateProjectGreenCertificateSchema =
  createProjectGreenCertificateSchema;

export type UpdateProjectGreenCertificateInput = z.infer<
  typeof updateProjectGreenCertificateSchema
>;

export const greenBuildingCertificateListQuerySchema = z.object({
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

export type GreenBuildingCertificateListQuery = z.infer<
  typeof greenBuildingCertificateListQuerySchema
>;

export const greenBuildingProjectOptionsQuerySchema = z.object({
  q: z.string().trim().max(200, "Pencarian maksimal 200 karakter").optional(),
});

export type GreenBuildingProjectOptionsQuery = z.infer<
  typeof greenBuildingProjectOptionsQuerySchema
>;
