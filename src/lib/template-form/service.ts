import {
  canManageTemplateForm,
  canViewTemplateForm,
} from "@/lib/template-form/access";
import {
  deleteTemplateFormRow,
  findTemplateFormRowByBlobPathname,
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
import {
  isTemplateFormAllowedFileName,
  isTemplateFormMimeTypeAllowed,
  normalizeMimeType,
  isTemplateFormSourceType,
  TEMPLATE_FORM_MAX_FILE_SIZE_BYTES,
  templateFormFileExtension,
  type TemplateFormSourceType,
} from "@/lib/template-form/source";
import {
  isValidTemplateFormBlobPathname,
  templateFormBlobPathnameExtension,
} from "@/lib/template-form/storage-path";
import {
  deleteBlob,
  headBlob,
  isBlobPubliclyReachable,
  openBlobDownload,
  type BlobDownload,
} from "@/lib/storage/blob";
import { findUserById } from "@/lib/users/repository";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

export type TemplateFormActor = {
  id: string;
  role: string;
  status: string;
};

// Client-facing record. Deliberately does NOT include blobPathname: storage
// identity stays internal and is resolved server-side by record id (download
// route). No route can leak it because it is not part of this type.
export type TemplateFormItem = {
  id: string;
  name: string;
  sourceType: TemplateFormSourceType;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  uploaderPicUserId: string;
  uploaderPic: { id: string; name: string };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateFormFile = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
  fileName: string;
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

// Invalid client input that only the domain can detect (pathname outside the
// Template & Form namespace, unsupported extension, metadata mismatch, ...).
export class TemplateFormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateFormValidationError";
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

// Exported guards so the upload token route applies the exact same rules.
export function ensureTemplateFormManage(actor: TemplateFormActor): void {
  assertManageAccess(actor);
}

export function ensureTemplateFormView(actor: TemplateFormActor): void {
  assertViewAccess(actor);
}

function normalizeSourceType(value: string): TemplateFormSourceType {
  return isTemplateFormSourceType(value) ? value : "link";
}

function toItem(row: TemplateFormRow): TemplateFormItem {
  return {
    id: row.id,
    name: row.name,
    sourceType: normalizeSourceType(row.sourceType),
    fileUrl: row.fileUrl,
    fileName: row.fileName,
    fileMimeType: row.fileMimeType,
    fileSizeBytes: row.fileSizeBytes,
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

type UploadMetadataInput = {
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  blobPathname?: string;
};

type VerifiedUpload = {
  blobPathname: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
};

/**
 * Server-side verification of a claimed upload. The browser is never trusted:
 * the stored object must exist, live inside the Template & Form namespace, be
 * within the 50 MB limit, and carry a content type consistent with the
 * extension.
 */
async function verifyUploadSource(
  input: UploadMetadataInput,
): Promise<VerifiedUpload> {
  const { fileName, blobPathname } = input;
  if (!fileName || !blobPathname) {
    throw new TemplateFormValidationError("Data upload tidak lengkap");
  }
  if (!isTemplateFormAllowedFileName(fileName)) {
    throw new TemplateFormValidationError("Format file tidak didukung.");
  }
  if (!isValidTemplateFormBlobPathname(blobPathname)) {
    throw new TemplateFormValidationError("Path file tidak valid");
  }

  const fileNameExtension = templateFormFileExtension(fileName);
  const pathnameExtension = templateFormBlobPathnameExtension(blobPathname);
  if (!fileNameExtension || pathnameExtension !== fileNameExtension) {
    throw new TemplateFormValidationError(
      "Path file tidak sesuai dengan nama file",
    );
  }

  if (
    input.fileMimeType !== undefined &&
    !isTemplateFormMimeTypeAllowed(fileNameExtension, input.fileMimeType)
  ) {
    throw new TemplateFormValidationError(
      "Tipe file tidak sesuai dengan format file.",
    );
  }
  if (
    input.fileSizeBytes !== undefined &&
    (input.fileSizeBytes <= 0 ||
      input.fileSizeBytes > TEMPLATE_FORM_MAX_FILE_SIZE_BYTES)
  ) {
    throw new TemplateFormValidationError("Ukuran file maksimal 50 MB.");
  }

  const blob = await headBlob(blobPathname);
  if (!blob || blob.pathname !== blobPathname) {
    throw new TemplateFormValidationError(
      "File upload tidak valid atau tidak ditemukan.",
    );
  }
  if (blob.size <= 0 || blob.size > TEMPLATE_FORM_MAX_FILE_SIZE_BYTES) {
    throw new TemplateFormValidationError("Ukuran file maksimal 50 MB.");
  }
  if (
    input.fileSizeBytes !== undefined &&
    input.fileSizeBytes !== blob.size
  ) {
    throw new TemplateFormValidationError("Metadata file tidak sesuai.");
  }

  const blobMimeType = normalizeMimeType(blob.contentType);
  if (!isTemplateFormMimeTypeAllowed(fileNameExtension, blobMimeType)) {
    throw new TemplateFormValidationError(
      "Tipe file tidak sesuai dengan format file.",
    );
  }

  // The SDK cannot pin `access` when minting a client token, so the store
  // itself must be private. This probe confirms the object is not anonymously
  // downloadable; an inconclusive probe (network hiccup) does not block a
  // legitimate upload.
  const publiclyReachable = await isBlobPubliclyReachable(blob.url);
  if (publiclyReachable === true) {
    throw new TemplateFormValidationError(
      "File harus disimpan pada penyimpanan privat.",
    );
  }

  return {
    blobPathname,
    fileName,
    fileMimeType: blobMimeType || "application/octet-stream",
    fileSizeBytes: blob.size,
  };
}

// Cleanup after a successful DB change: never let a storage failure surface as
// a failure of the record operation that already committed.
async function deleteTemplateFormBlobBestEffort(pathname: string): Promise<void> {
  try {
    const result = await deleteBlob(pathname);
    if (!result.deleted && result.reason === "not-configured") {
      console.warn(
        "Template & Form: blob cleanup skipped because storage is not configured",
      );
    }
  } catch (error) {
    console.error("Template & Form: blob cleanup failed", error);
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

  if (input.sourceType === "upload") {
    const verified = await verifyUploadSource(input);
    await validateUploaderPic(input.uploaderPicUserId);
    const id = await insertTemplateForm({
      name: input.name,
      sourceType: "upload",
      fileUrl: null,
      fileName: verified.fileName,
      fileMimeType: verified.fileMimeType,
      fileSizeBytes: verified.fileSizeBytes,
      blobPathname: verified.blobPathname,
      uploaderPicUserId: input.uploaderPicUserId,
      createdBy: actor.id,
    });
    return getTemplateFormOrThrow(id);
  }

  if (input.fileUrl === undefined) {
    throw new TemplateFormConflictError("File URL wajib diisi");
  }
  await validateUploaderPic(input.uploaderPicUserId);
  const id = await insertTemplateForm({
    name: input.name,
    sourceType: "link",
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

  // Storage path to remove only AFTER the database write committed. Never
  // delete first: a failed update must leave the current file intact.
  let blobPathnameToDelete: string | null = null;
  const existingIsUpload = existing.sourceType === "upload";

  if (input.sourceType === "link") {
    // Upload -> Link, or Link -> Link.
    if (input.fileUrl === undefined) {
      throw new TemplateFormConflictError("File URL wajib diisi");
    }
    patch.sourceType = "link";
    patch.fileUrl = input.fileUrl;
    patch.fileName = null;
    patch.fileMimeType = null;
    patch.fileSizeBytes = null;
    patch.blobPathname = null;
    if (existingIsUpload && existing.blobPathname) {
      blobPathnameToDelete = existing.blobPathname;
    }
  } else if (input.sourceType === "upload") {
    // Link -> Upload, or Upload replacement.
    const verified = await verifyUploadSource(input);
    patch.sourceType = "upload";
    patch.fileUrl = null;
    patch.fileName = verified.fileName;
    patch.fileMimeType = verified.fileMimeType;
    patch.fileSizeBytes = verified.fileSizeBytes;
    patch.blobPathname = verified.blobPathname;
    if (
      existing.blobPathname &&
      existing.blobPathname !== verified.blobPathname
    ) {
      blobPathnameToDelete = existing.blobPathname;
    }
  } else if (!existingIsUpload && input.fileUrl !== undefined) {
    // Legacy behaviour: a link record accepts a URL-only patch.
    patch.fileUrl = input.fileUrl;
  }
  // Name/PIC-only patch: source, file metadata and storage path are untouched.

  if (input.uploaderPicUserId !== undefined) {
    patch.uploaderPicUserId = input.uploaderPicUserId;
  }

  const updated = await updateTemplateFormRow(id, patch);
  if (!updated) {
    throw new TemplateFormNotFoundError();
  }

  if (blobPathnameToDelete) {
    await deleteTemplateFormBlobBestEffort(blobPathnameToDelete);
  }

  return getTemplateFormOrThrow(id);
}

export async function deleteTemplateForm(
  actor: TemplateFormActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);
  const existing = await findTemplateFormRowById(id);
  if (!existing) {
    throw new TemplateFormNotFoundError();
  }
  const blobPathname =
    existing.sourceType === "upload" ? existing.blobPathname : null;

  // DB first, storage second: the record is the source of truth and the blob
  // can be swept later if storage deletion fails.
  const deleted = await deleteTemplateFormRow(id);
  if (!deleted) {
    throw new TemplateFormNotFoundError();
  }

  if (blobPathname) {
    await deleteTemplateFormBlobBestEffort(blobPathname);
  }

  return { deleted: true, id };
}

/**
 * Authenticated download of an uploaded document. The record id is the only
 * selector accepted from the client; the storage pathname is resolved here.
 */
export async function getTemplateFormFile(
  actor: TemplateFormActor,
  id: string,
): Promise<TemplateFormFile> {
  assertViewAccess(actor);
  const row = await findTemplateFormRowById(id);
  if (!row) {
    throw new TemplateFormNotFoundError();
  }
  if (row.sourceType !== "upload" || !row.blobPathname) {
    throw new TemplateFormNotFoundError("File tidak tersedia.");
  }

  const download: BlobDownload | null = await openBlobDownload(
    row.blobPathname,
  );
  if (!download) {
    throw new TemplateFormNotFoundError("File tidak tersedia.");
  }

  return {
    stream: download.stream,
    contentType:
      normalizeMimeType(download.contentType) ||
      row.fileMimeType ||
      "application/octet-stream",
    size: download.size > 0 ? download.size : (row.fileSizeBytes ?? 0),
    fileName: row.fileName ?? "template-form",
  };
}

/**
 * Orphan cleanup. Refuses to delete any object still referenced by a row, and
 * only touches pathnames inside the Template & Form namespace.
 */
export async function deleteTemplateFormBlobIfUnreferenced(
  actor: TemplateFormActor,
  pathname: string,
): Promise<{ deleted: boolean }> {
  assertManageAccess(actor);
  if (!isValidTemplateFormBlobPathname(pathname)) {
    throw new TemplateFormValidationError("Path file tidak valid");
  }
  const reference = await findTemplateFormRowByBlobPathname(pathname);
  if (reference) {
    throw new TemplateFormConflictError(
      "File masih digunakan oleh Template & Form.",
    );
  }
  const result = await deleteBlob(pathname);
  return { deleted: result.deleted };
}

export async function listTemplateFormPicOptions(
  actor: TemplateFormActor,
): Promise<TemplateFormPicOption[]> {
  assertManageAccess(actor);
  return listHeadOfficePicOptions();
}
