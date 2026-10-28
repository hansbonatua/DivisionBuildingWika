import { z } from "zod";

const nameField = z
  .string()
  .trim()
  .min(1, "Nama Proyek wajib diisi")
  .max(200, "Nama Proyek maksimal 200 karakter");

const locationField = z
  .string()
  .trim()
  .min(1, "Lokasi Proyek wajib diisi")
  .max(200, "Lokasi Proyek maksimal 200 karakter");

const picUserIdField = z.uuid("PIC tidak valid");

// A project has exactly one year (never start_year/end_year). Integer only:
// a decimal or a numeric string is rejected by shape, matching the existing
// contract style where API numbers are real JSON numbers. The PostgreSQL
// CHECK constraint repeats the lower bound as the final backstop.
const yearField = z
  .number()
  .int("Tahun harus bilangan bulat")
  .min(2000, "Tahun minimal 2000");

export const createMasterProjectSchema = z
  .object({
    name: nameField,
    location: locationField,
    year: yearField,
    picUserId: picUserIdField,
  })
  .strict();

export type CreateMasterProjectInput = z.infer<
  typeof createMasterProjectSchema
>;

export const updateMasterProjectSchema = z
  .object({
    name: nameField.optional(),
    location: locationField.optional(),
    // Year is editable: a mistyped year must be correctable through the normal
    // edit flow rather than requiring a delete/recreate.
    year: yearField.optional(),
    picUserId: picUserIdField.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type UpdateMasterProjectInput = z.infer<
  typeof updateMasterProjectSchema
>;
