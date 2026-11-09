import { z } from "zod";

// Input contract for Project Documentation (PDOC).
//
// Every week field is optional so a PUT can update only the fields the client
// sends. An omitted field is left untouched; an explicit null or empty string
// clears the value. Unknown fields are rejected rather than stripped.

export const PDOC_URL_MAX = 2048;
export const PDOC_CATATAN_MAX = 2000;

export function isSafePdocUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

const weekUrlField = z
  .string()
  .trim()
  .max(PDOC_URL_MAX, `URL minggu maksimal ${PDOC_URL_MAX} karakter`)
  .refine(
    (value) => value.length === 0 || isSafePdocUrl(value),
    "URL minggu harus diawali http:// atau https://",
  )
  .nullish()
  .transform((value) =>
    value === undefined ? undefined : value && value.length > 0 ? value : null,
  );

const catatanField = z
  .string()
  .trim()
  .max(PDOC_CATATAN_MAX, `Catatan maksimal ${PDOC_CATATAN_MAX} karakter`)
  .nullish()
  .transform((value) =>
    value === undefined ? undefined : value && value.length > 0 ? value : null,
  );

export const updateProjectDocumentationSchema = z
  .object({
    week_1_url: weekUrlField,
    week_2_url: weekUrlField,
    week_3_url: weekUrlField,
    week_4_url: weekUrlField,
    week_5_url: weekUrlField,
    catatan: catatanField,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type UpdateProjectDocumentationInput = z.infer<
  typeof updateProjectDocumentationSchema
>;
