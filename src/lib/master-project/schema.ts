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

export const createMasterProjectSchema = z
  .object({
    name: nameField,
    location: locationField,
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
    picUserId: picUserIdField.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type UpdateMasterProjectInput = z.infer<
  typeof updateMasterProjectSchema
>;
