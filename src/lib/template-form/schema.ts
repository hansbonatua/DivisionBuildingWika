import { z } from "zod";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const nameField = z.string().trim().min(1, "Nama wajib diisi").max(200);

const fileUrlField = z
  .string()
  .trim()
  .min(1, "File URL wajib diisi")
  .max(2000)
  .refine(isHttpUrl, "File URL harus menggunakan http atau https");

const uploaderPicUserIdField = z.uuid("PIC tidak valid");

export const createTemplateFormSchema = z
  .object({
    name: nameField,
    fileUrl: fileUrlField,
    uploaderPicUserId: uploaderPicUserIdField,
  })
  .strict();

export type CreateTemplateFormInput = z.infer<typeof createTemplateFormSchema>;

export const updateTemplateFormSchema = z
  .object({
    name: nameField.optional(),
    fileUrl: fileUrlField.optional(),
    uploaderPicUserId: uploaderPicUserIdField.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type UpdateTemplateFormInput = z.infer<typeof updateTemplateFormSchema>;
