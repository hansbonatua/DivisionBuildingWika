import { z } from "zod";
import { ENGINEERING_DATABASE_CATEGORIES } from "@/lib/engineering-database/access";

// Engineering Databases input contracts (V1 backend).
// category is create-only and never appears in the update contract
// (immutable after create, enforced by the DB CHECK + strict schema below).
// note is REQUIRED and NOT NULL in V1 — there is no nullable-note path.

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const projectIdField = z.uuid("Project tidak valid");

const categoryField = z.enum(ENGINEERING_DATABASE_CATEGORIES);

const fileUrlField = z
  .string()
  .trim()
  .min(1, "File URL wajib diisi")
  .max(2000, "File URL maksimal 2000 karakter")
  .refine(isHttpUrl, "File URL harus menggunakan http atau https");

const picUserIdField = z.uuid("PIC tidak valid");

const noteField = z
  .string()
  .trim()
  .min(1, "Note wajib diisi")
  .max(10000, "Note maksimal 10000 karakter");

export const createEngineeringDatabaseEntrySchema = z
  .object({
    projectId: projectIdField,
    category: categoryField,
    fileUrl: fileUrlField,
    picUserId: picUserIdField,
    note: noteField,
  })
  .strict();

export type CreateEngineeringDatabaseEntryInput = z.infer<
  typeof createEngineeringDatabaseEntrySchema
>;

// Editable fields only: project (may be changed), file URL, PIC and note.
// category / id / createdBy / createdAt are immutable and are REJECTED here
// (strict) rather than silently stripped.
export const updateEngineeringDatabaseEntrySchema = z
  .object({
    projectId: projectIdField.optional(),
    fileUrl: fileUrlField.optional(),
    picUserId: picUserIdField.optional(),
    note: noteField.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type UpdateEngineeringDatabaseEntryInput = z.infer<
  typeof updateEngineeringDatabaseEntrySchema
>;

// List contract: every listing is category-scoped. Unknown/absent category is
// a client error (400), never a silent "all categories" listing. `q` is an
// optional server-side search over the canonical Master Project name/location
// only (never file URL, PIC or note).
export const engineeringDatabaseListQuerySchema = z.object({
  category: categoryField,
  q: z.string().trim().max(200, "Pencarian maksimal 200 karakter").optional(),
});

// Searchable project picker contract (server-side search, SQL-level limit).
export const engineeringDatabaseProjectOptionsQuerySchema = z.object({
  q: z.string().max(200, "Pencarian maksimal 200 karakter").optional(),
});
