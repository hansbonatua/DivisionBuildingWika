import { asc, eq } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import {
  templateForms,
  users,
  type NewPgTemplateForm,
} from "@/lib/pg/schema";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

export type TemplateFormRow = {
  id: string;
  name: string;
  sourceType: string;
  // Null for upload rows: file_url is link-only.
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  // Internal storage identity. Never part of an API response.
  blobPathname: string | null;
  uploaderPicUserId: string;
  uploaderPicName: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateFormPicOptionRow = {
  id: string;
  name: string;
};

const templateFormColumns = {
  id: templateForms.id,
  name: templateForms.name,
  sourceType: templateForms.sourceType,
  fileUrl: templateForms.fileUrl,
  fileName: templateForms.fileName,
  fileMimeType: templateForms.fileMimeType,
  fileSizeBytes: templateForms.fileSizeBytes,
  blobPathname: templateForms.blobPathname,
  uploaderPicUserId: templateForms.uploaderPicUserId,
  uploaderPicName: users.name,
  createdBy: templateForms.createdBy,
  createdAt: templateForms.createdAt,
  updatedAt: templateForms.updatedAt,
};

export async function listTemplateFormRows(): Promise<TemplateFormRow[]> {
  return getPgDb()
    .select(templateFormColumns)
    .from(templateForms)
    .innerJoin(users, eq(templateForms.uploaderPicUserId, users.id))
    .orderBy(asc(templateForms.name), asc(templateForms.id));
}

export async function findTemplateFormRowById(
  id: string,
): Promise<TemplateFormRow | null> {
  const rows = await getPgDb()
    .select(templateFormColumns)
    .from(templateForms)
    .innerJoin(users, eq(templateForms.uploaderPicUserId, users.id))
    .where(eq(templateForms.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertTemplateForm(
  data: NewPgTemplateForm,
): Promise<string> {
  const rows = await getPgDb()
    .insert(templateForms)
    .values(data)
    .returning({ id: templateForms.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create Template / Form");
  }
  return created.id;
}

export async function updateTemplateFormRow(
  id: string,
  patch: Partial<
    Pick<
      NewPgTemplateForm,
      | "name"
      | "sourceType"
      | "fileUrl"
      | "fileName"
      | "fileMimeType"
      | "fileSizeBytes"
      | "blobPathname"
      | "uploaderPicUserId"
    >
  >,
): Promise<boolean> {
  const rows = await getPgDb()
    .update(templateForms)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(templateForms.id, id))
    .returning({ id: templateForms.id });
  return rows.length > 0;
}

export async function deleteTemplateFormRow(id: string): Promise<boolean> {
  const rows = await getPgDb()
    .delete(templateForms)
    .where(eq(templateForms.id, id))
    .returning({ id: templateForms.id });
  return rows.length > 0;
}

// Storage-reference check used by orphan cleanup: a pathname claimed by any row
// must never be deleted from storage.
export async function findTemplateFormRowByBlobPathname(
  pathname: string,
): Promise<{ id: string } | null> {
  const rows = await getPgDb()
    .select({ id: templateForms.id })
    .from(templateForms)
    .where(eq(templateForms.blobPathname, pathname))
    .limit(1);
  return rows[0] ?? null;
}

export async function listHeadOfficePicOptions(): Promise<
  TemplateFormPicOptionRow[]
> {
  return getPgDb()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.role, HEAD_OFFICE_ROLE))
    .orderBy(asc(users.name), asc(users.id));
}
