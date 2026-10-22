import {
  canManageTemplateForm,
  canViewTemplateForm,
} from "@/lib/template-form/access";
import {
  deleteTemplateFormRow,
  findTemplateFormRowById,
  insertTemplateForm,
  listHeadOfficePicOptions,
  listTemplateFormRows,
  updateTemplateFormRow,
  type TemplateFormPicOptionRow,
  type TemplateFormRow,
} from "@/lib/template-form/repository";
import type {
  CreateTemplateFormInput,
  UpdateTemplateFormInput,
} from "@/lib/template-form/schema";
import { findUserById } from "@/lib/users/repository";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

export type TemplateFormActor = {
  id: string;
  role: string;
  status: string;
};

export type TemplateFormItem = {
  id: string;
  name: string;
  fileUrl: string;
  uploaderPicUserId: string;
  uploaderPic: { id: string; name: string };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateFormPicOption = TemplateFormPicOptionRow;

export class TemplateFormForbiddenError extends Error {
  constructor(message = "Akses Template & Form ditolak") {
    super(message);
    this.name = "TemplateFormForbiddenError";
  }
}

export class TemplateFormNotFoundError extends Error {
  constructor(message = "Template / Form tidak ditemukan") {
    super(message);
    this.name = "TemplateFormNotFoundError";
  }
}

export class TemplateFormConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateFormConflictError";
  }
}

function assertActive(actor: TemplateFormActor): void {
  if (actor.status !== "active") {
    throw new TemplateFormForbiddenError();
  }
}

function assertViewAccess(actor: TemplateFormActor): void {
  assertActive(actor);
  if (!canViewTemplateForm(actor.role)) {
    throw new TemplateFormForbiddenError();
  }
}

function assertManageAccess(actor: TemplateFormActor): void {
  assertActive(actor);
  if (!canManageTemplateForm(actor.role)) {
    throw new TemplateFormForbiddenError();
  }
}

function toItem(row: TemplateFormRow): TemplateFormItem {
  return {
    id: row.id,
    name: row.name,
    fileUrl: row.fileUrl,
    uploaderPicUserId: row.uploaderPicUserId,
    uploaderPic: { id: row.uploaderPicUserId, name: row.uploaderPicName },
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getTemplateFormOrThrow(id: string): Promise<TemplateFormItem> {
  const row = await findTemplateFormRowById(id);
  if (!row) {
    throw new TemplateFormNotFoundError();
  }
  return toItem(row);
}

async function validateUploaderPic(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new TemplateFormNotFoundError("PIC tidak ditemukan");
  }
  if (user.role !== HEAD_OFFICE_ROLE) {
    throw new TemplateFormConflictError(
      "PIC harus user dengan role Head Office",
    );
  }
}

export async function listTemplateForms(
  actor: TemplateFormActor,
): Promise<TemplateFormItem[]> {
  assertViewAccess(actor);
  const rows = await listTemplateFormRows();
  return rows.map(toItem);
}

export async function getTemplateForm(
  actor: TemplateFormActor,
  id: string,
): Promise<TemplateFormItem> {
  assertViewAccess(actor);
  return getTemplateFormOrThrow(id);
}

export async function createTemplateForm(
  actor: TemplateFormActor,
  input: CreateTemplateFormInput,
): Promise<TemplateFormItem> {
  assertManageAccess(actor);
  await validateUploaderPic(input.uploaderPicUserId);
  const id = await insertTemplateForm({
    name: input.name,
    fileUrl: input.fileUrl,
    uploaderPicUserId: input.uploaderPicUserId,
    createdBy: actor.id,
  });
  return getTemplateFormOrThrow(id);
}

export async function updateTemplateForm(
  actor: TemplateFormActor,
  id: string,
  input: UpdateTemplateFormInput,
): Promise<TemplateFormItem> {
  assertManageAccess(actor);
  const existing = await findTemplateFormRowById(id);
  if (!existing) {
    throw new TemplateFormNotFoundError();
  }
  if (input.uploaderPicUserId !== undefined) {
    await validateUploaderPic(input.uploaderPicUserId);
  }
  const patch: Parameters<typeof updateTemplateFormRow>[1] = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.fileUrl !== undefined) patch.fileUrl = input.fileUrl;
  if (input.uploaderPicUserId !== undefined) {
    patch.uploaderPicUserId = input.uploaderPicUserId;
  }
  const updated = await updateTemplateFormRow(id, patch);
  if (!updated) {
    throw new TemplateFormNotFoundError();
  }
  return getTemplateFormOrThrow(id);
}

export async function deleteTemplateForm(
  actor: TemplateFormActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);
  const deleted = await deleteTemplateFormRow(id);
  if (!deleted) {
    throw new TemplateFormNotFoundError();
  }
  return { deleted: true, id };
}

export async function listTemplateFormPicOptions(
  actor: TemplateFormActor,
): Promise<TemplateFormPicOption[]> {
  assertManageAccess(actor);
  return listHeadOfficePicOptions();
}
