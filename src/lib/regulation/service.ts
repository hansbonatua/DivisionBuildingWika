import { getPgDb } from "@/lib/pg/client";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg/errors";
import {
  RegulationForbiddenError,
  assertRegulationManageAccess,
  assertRegulationViewAccess,
} from "@/lib/regulation/access";
import {
  getRegulationDisiplinByKey,
  type RegulationDisiplinKey,
} from "@/lib/regulation/constants";
import {
  countDocumentsInSubKategori,
  deleteDocument as deleteDocumentRow,
  deleteSubKategori as deleteSubKategoriRow,
  findDocumentById,
  findDocumentByFilePathname,
  findSubKategoriById,
  insertDocument as insertDocumentRow,
  insertSubKategori as insertSubKategoriRow,
  listDocumentsForSubKategoriIds,
  listReorderDocumentIds,
  listReorderSubKategoriIds,
  listSubKategoriRows,
  listUsersByIds,
  nextDocumentSortOrder,
  nextSubKategoriSortOrder,
  updateDocument as updateDocumentRow,
  updateSortOrders,
  updateSubKategori as updateSubKategoriRow,
  type RegulationDocumentRow,
  type RegulationDocumentUpdate,
  type RegulationSubKategoriRow,
  type RegulationSubKategoriUpdate,
} from "@/lib/regulation/repository";
import type {
  CreateDocumentInput,
  CreateSubKategoriInput,
  ReorderInput,
  UpdateDocumentInput,
  UpdateSubKategoriInput,
} from "@/lib/regulation/schema";
import {
  REGULATION_MAX_FILE_SIZE_BYTES,
  isRegulationAllowedFileName,
  isRegulationMimeTypeAllowed,
  isValidRegulationBlobPathname,
  normalizeMimeType,
  regulationBlobPathnameExtension,
  regulationFileExtension,
} from "@/lib/regulation/storage";
import {
  deleteBlob,
  headBlob,
  isBlobPubliclyReachable,
  openBlobDownload,
} from "@/lib/storage/blob";

export type RegulationActor = {
  id: string;
  role: string;
  status: string;
};

export type RegulationUserRef = {
  user_id: string;
  name: string;
};

export type RegulationAuditDto = {
  created_by: RegulationUserRef;
  created_at: string;
  updated_by: RegulationUserRef | null;
  updated_at: string;
};

export type RegulationDocumentDto = RegulationAuditDto & {
  id: string;
  kode: string;
  nama: string;
  sort_order: number;
  file_name: string;
  file_mime_type: string;
  file_size_bytes: number;
  note: string | null;
};

export type RegulationSubKategoriDto = RegulationAuditDto & {
  id: string;
  disiplin: RegulationDisiplinKey;
  kode: string;
  nama: string;
  sort_order: number;
  note: string | null;
  documents: RegulationDocumentDto[];
};

export type RegulationDisiplinDetailDto = {
  disiplin: {
    key: RegulationDisiplinKey;
    slug: string;
    name: string;
  };
  sub_kategori: RegulationSubKategoriDto[];
};

export type RegulationDocumentFile = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
  fileName: string;
};

export class RegulationNotFoundError extends Error {
  constructor(message = "Data Standard & Regulation tidak ditemukan") {
    super(message);
    this.name = "RegulationNotFoundError";
  }
}

export class RegulationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegulationConflictError";
  }
}

export class RegulationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegulationValidationError";
  }
}

function assertActive(actor: RegulationActor): void {
  if (actor.status !== "active") {
    throw new RegulationForbiddenError();
  }
}

function assertViewActor(actor: RegulationActor): void {
  assertActive(actor);
  assertRegulationViewAccess(actor.role);
}

function assertManageActor(actor: RegulationActor): void {
  assertActive(actor);
  assertRegulationManageAccess(actor.role);
}

export function ensureRegulationManage(actor: RegulationActor): void {
  assertManageActor(actor);
}

function normalizeKode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0 || normalized.length > 30) {
    throw new RegulationValidationError("Kode harus 1–30 karakter");
  }
  return normalized;
}

function normalizeNama(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    throw new RegulationValidationError("Nama harus 1–200 karakter");
  }
  return normalized;
}

function normalizeNote(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length > 2000) {
    throw new RegulationValidationError("Catatan maksimal 2.000 karakter");
  }
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalNote(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  return normalizeNote(value);
}

function userRef(
  id: string,
  usersById: ReadonlyMap<string, { id: string; name: string }>,
): RegulationUserRef {
  return { user_id: id, name: usersById.get(id)?.name ?? "—" };
}

function auditFields(
  row: RegulationSubKategoriRow | RegulationDocumentRow,
  usersById: ReadonlyMap<string, { id: string; name: string }>,
): RegulationAuditDto {
  return {
    created_by: userRef(row.createdById, usersById),
    created_at: row.createdAt.toISOString(),
    updated_by: row.updatedById
      ? userRef(row.updatedById, usersById)
      : null,
    updated_at: row.updatedAt.toISOString(),
  };
}

function toDocumentDto(
  row: RegulationDocumentRow,
  usersById: ReadonlyMap<string, { id: string; name: string }>,
): RegulationDocumentDto {
  return {
    ...auditFields(row, usersById),
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    sort_order: row.sortOrder,
    file_name: row.fileName,
    file_mime_type: row.fileMimeType,
    file_size_bytes: row.fileSizeBytes,
    note: row.note,
  };
}

function hasSqlState(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const state = (error as { code?: unknown }).code;
  if (state === code) return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : hasSqlState(cause, code, depth + 1);
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof RegulationForbiddenError ||
    error instanceof RegulationNotFoundError ||
    error instanceof RegulationConflictError ||
    error instanceof RegulationValidationError
  ) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new RegulationConflictError(
      "Kode atau path file sudah digunakan. Muat ulang data terbaru.",
    );
  }
  if (isForeignKeyViolation(error)) {
    throw new RegulationConflictError(
      "Data terkait sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new RegulationValidationError(
      "Data Standard & Regulation tidak memenuhi aturan database.",
    );
  }
  throw error;
}

async function deleteBlobBestEffort(pathname: string): Promise<void> {
  try {
    const result = await deleteBlob(pathname);
    if (!result.deleted && result.reason === "not-configured") {
      console.warn(
        "Regulation: blob cleanup skipped because storage is not configured",
      );
    }
  } catch (error) {
    console.error("Regulation: blob cleanup failed", error);
  }
}

type VerifiedUpload = {
  filePathname: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
};

async function verifyUploadSource(input: {
  fileName: string;
  blobPathname: string;
}): Promise<VerifiedUpload> {
  const fileName = input.fileName.trim();
  const filePathname = input.blobPathname.trim();

  if (!isRegulationAllowedFileName(fileName)) {
    throw new RegulationValidationError(
      "Format file harus PDF, Word, Excel, atau ZIP",
    );
  }
  if (!isValidRegulationBlobPathname(filePathname)) {
    throw new RegulationValidationError("Path file tidak valid");
  }

  const fileNameExtension = regulationFileExtension(fileName);
  const pathnameExtension = regulationBlobPathnameExtension(filePathname);
  if (!fileNameExtension || pathnameExtension !== fileNameExtension) {
    throw new RegulationValidationError(
      "Path file tidak sesuai dengan nama file",
    );
  }

  const blob = await headBlob(filePathname);
  if (!blob || blob.pathname !== filePathname) {
    throw new RegulationValidationError(
      "File upload tidak valid atau tidak ditemukan.",
    );
  }
  if (
    blob.size <= 0 ||
    blob.size > REGULATION_MAX_FILE_SIZE_BYTES
  ) {
    throw new RegulationValidationError("Ukuran file maksimal 20 MB.");
  }

  const blobMimeType = normalizeMimeType(blob.contentType);
  if (!isRegulationMimeTypeAllowed(fileNameExtension, blobMimeType)) {
    throw new RegulationValidationError(
      "Tipe file tidak sesuai dengan format file.",
    );
  }

  const publiclyReachable = await isBlobPubliclyReachable(blob.url);
  if (publiclyReachable === true) {
    throw new RegulationValidationError(
      "File harus disimpan pada penyimpanan privat.",
    );
  }

  return {
    filePathname,
    fileName,
    fileMimeType: blobMimeType,
    fileSizeBytes: blob.size,
  };
}

async function loadDisiplinDetail(
  disiplinKey: RegulationDisiplinKey,
): Promise<RegulationDisiplinDetailDto> {
  const disiplin = getRegulationDisiplinByKey(disiplinKey);
  if (!disiplin) {
    throw new RegulationNotFoundError("Disiplin tidak ditemukan");
  }

  const subRows = await listSubKategoriRows(disiplin.key);
  const subIds = subRows.map((row) => row.id);
  const documentRows = await listDocumentsForSubKategoriIds(subIds);

  const authorIds = [
    ...new Set(
      [...subRows, ...documentRows].flatMap((row) =>
        [row.createdById, row.updatedById].filter(
          (id): id is string => id !== null,
        ),
      ),
    ),
  ];
  const authors = await listUsersByIds(authorIds);
  const usersById = new Map(authors.map((user) => [user.id, user]));
  const documentsBySub = new Map<string, RegulationDocumentRow[]>();
  for (const row of documentRows) {
    const list = documentsBySub.get(row.subKategoriId) ?? [];
    list.push(row);
    documentsBySub.set(row.subKategoriId, list);
  }

  return {
    disiplin: {
      key: disiplin.key,
      slug: disiplin.slug,
      name: disiplin.name,
    },
    sub_kategori: subRows.map((row) => ({
      ...auditFields(row, usersById),
      id: row.id,
      disiplin: disiplin.key,
      kode: row.kode,
      nama: row.nama,
      sort_order: row.sortOrder,
      note: row.note,
      documents: (documentsBySub.get(row.id) ?? []).map((document) =>
        toDocumentDto(document, usersById),
      ),
    })),
  };
}

export async function getRegulationDisiplinDetail(
  actor: RegulationActor,
  disiplinKey: string,
): Promise<RegulationDisiplinDetailDto> {
  assertViewActor(actor);
  const disiplin = getRegulationDisiplinByKey(disiplinKey);
  if (!disiplin) {
    throw new RegulationNotFoundError("Disiplin tidak ditemukan");
  }
  return loadDisiplinDetail(disiplin.key);
}

export async function createRegulationSubKategori(
  actor: RegulationActor,
  disiplinKey: string,
  input: CreateSubKategoriInput,
): Promise<RegulationSubKategoriDto> {
  assertManageActor(actor);
  const disiplin = getRegulationDisiplinByKey(disiplinKey);
  if (!disiplin) {
    throw new RegulationNotFoundError("Disiplin tidak ditemukan");
  }

  const db = getPgDb();
  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const sortOrder = await nextSubKategoriSortOrder(disiplin.key, tx);
      return insertSubKategoriRow(
        {
          disiplin: disiplin.key,
          kode: normalizeKode(input.kode),
          nama: normalizeNama(input.nama),
          sortOrder,
          note: normalizeNote(input.note),
          createdBy: actor.id,
        },
        tx,
      );
    });
  } catch (error) {
    mapWriteError(error);
  }

  const detail = await loadDisiplinDetail(disiplin.key);
  const created = detail.sub_kategori.find((row) => row.id === id);
  if (!created) {
    throw new RegulationNotFoundError();
  }
  return created;
}

export async function updateRegulationSubKategori(
  actor: RegulationActor,
  id: string,
  input: UpdateSubKategoriInput,
): Promise<RegulationSubKategoriDto> {
  assertManageActor(actor);
  const current = await findSubKategoriById(id);
  if (!current) {
    throw new RegulationNotFoundError("Sub-kategori tidak ditemukan");
  }

  const patch: RegulationSubKategoriUpdate = {
    kode: normalizeKode(input.kode),
    nama: normalizeNama(input.nama),
    updatedBy: actor.id,
  };
  const note = normalizeOptionalNote(input.note);
  if (note !== undefined) patch.note = note;

  try {
    const updated = await updateSubKategoriRow(id, patch);
    if (!updated) {
      throw new RegulationNotFoundError("Sub-kategori tidak ditemukan");
    }
  } catch (error) {
    mapWriteError(error);
  }

  const detail = await loadDisiplinDetail(
    current.disiplin as RegulationDisiplinKey,
  );
  const updated = detail.sub_kategori.find((row) => row.id === id);
  if (!updated) {
    throw new RegulationNotFoundError();
  }
  return updated;
}

export async function deleteRegulationSubKategori(
  actor: RegulationActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageActor(actor);
  const current = await findSubKategoriById(id);
  if (!current) {
    throw new RegulationNotFoundError("Sub-kategori tidak ditemukan");
  }
  const documentCount = await countDocumentsInSubKategori(id);
  if (documentCount > 0) {
    throw new RegulationConflictError(
      "Sub-kategori masih memiliki dokumen dan tidak dapat dihapus.",
    );
  }

  try {
    const deleted = await deleteSubKategoriRow(id);
    if (!deleted) {
      throw new RegulationNotFoundError("Sub-kategori tidak ditemukan");
    }
  } catch (error) {
    mapWriteError(error);
  }
  return { deleted: true, id };
}

export async function createRegulationDocument(
  actor: RegulationActor,
  subKategoriId: string,
  input: CreateDocumentInput,
): Promise<RegulationDocumentDto> {
  assertManageActor(actor);
  const sub = await findSubKategoriById(subKategoriId);
  if (!sub) {
    throw new RegulationNotFoundError("Sub-kategori tidak ditemukan");
  }

  const verified = await verifyUploadSource({
    fileName: input.file_name,
    blobPathname: input.blob_pathname,
  });
  const db = getPgDb();
  let id: string;
  try {
    id = await db.transaction(async (tx) => {
      const sortOrder = await nextDocumentSortOrder(subKategoriId, tx);
      return insertDocumentRow(
        {
          subKategoriId,
          kode: normalizeKode(input.kode),
          nama: normalizeNama(input.nama),
          sortOrder,
          filePathname: verified.filePathname,
          fileName: verified.fileName,
          fileMimeType: verified.fileMimeType,
          fileSizeBytes: verified.fileSizeBytes,
          note: normalizeNote(input.note),
          createdBy: actor.id,
        },
        tx,
      );
    });
  } catch (error) {
    mapWriteError(error);
  }

  const detail = await loadDisiplinDetail(
    sub.disiplin as RegulationDisiplinKey,
  );
  const created = detail.sub_kategori
    .flatMap((row) => row.documents)
    .find((row) => row.id === id);
  if (!created) {
    throw new RegulationNotFoundError();
  }
  return created;
}

export async function updateRegulationDocument(
  actor: RegulationActor,
  id: string,
  input: UpdateDocumentInput,
): Promise<RegulationDocumentDto> {
  assertManageActor(actor);
  const current = await findDocumentById(id);
  if (!current) {
    throw new RegulationNotFoundError("Dokumen tidak ditemukan");
  }

  const hasFileName = input.file_name !== undefined;
  const hasBlobPathname = input.blob_pathname !== undefined;
  if (hasFileName !== hasBlobPathname) {
    throw new RegulationValidationError(
      "Nama file dan path file harus dikirim bersamaan",
    );
  }

  const patch: RegulationDocumentUpdate = { updatedBy: actor.id };
  if (input.kode !== undefined) patch.kode = normalizeKode(input.kode);
  if (input.nama !== undefined) patch.nama = normalizeNama(input.nama);
  const note = normalizeOptionalNote(input.note);
  if (note !== undefined) patch.note = note;

  let oldPathname: string | null = null;
  if (input.file_name !== undefined && input.blob_pathname !== undefined) {
    const verified = await verifyUploadSource({
      fileName: input.file_name,
      blobPathname: input.blob_pathname,
    });
    if (verified.filePathname !== current.filePathname) {
      oldPathname = current.filePathname;
    }
    patch.filePathname = verified.filePathname;
    patch.fileName = verified.fileName;
    patch.fileMimeType = verified.fileMimeType;
    patch.fileSizeBytes = verified.fileSizeBytes;
  }

  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      const updated = await updateDocumentRow(id, patch, tx);
      if (!updated) {
        throw new RegulationNotFoundError("Dokumen tidak ditemukan");
      }
    });
  } catch (error) {
    mapWriteError(error);
  }

  if (oldPathname) {
    await deleteBlobBestEffort(oldPathname);
  }

  const sub = await findSubKategoriById(current.subKategoriId);
  if (!sub) {
    throw new RegulationNotFoundError("Sub-kategori tidak ditemukan");
  }
  const detail = await loadDisiplinDetail(
    sub.disiplin as RegulationDisiplinKey,
  );
  const updated = detail.sub_kategori
    .flatMap((row) => row.documents)
    .find((row) => row.id === id);
  if (!updated) {
    throw new RegulationNotFoundError();
  }
  return updated;
}

export async function deleteRegulationDocument(
  actor: RegulationActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageActor(actor);
  const current = await findDocumentById(id);
  if (!current) {
    throw new RegulationNotFoundError("Dokumen tidak ditemukan");
  }

  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      const deleted = await deleteDocumentRow(id, tx);
      if (!deleted) {
        throw new RegulationNotFoundError("Dokumen tidak ditemukan");
      }
    });
  } catch (error) {
    mapWriteError(error);
  }

  await deleteBlobBestEffort(current.filePathname);
  return { deleted: true, id };
}

export async function getRegulationDocumentFile(
  actor: RegulationActor,
  id: string,
): Promise<RegulationDocumentFile> {
  assertViewActor(actor);
  const row = await findDocumentById(id);
  if (!row) {
    throw new RegulationNotFoundError("Dokumen tidak ditemukan");
  }

  const download = await openBlobDownload(row.filePathname);
  if (!download) {
    throw new RegulationNotFoundError("File tidak tersedia.");
  }

  return {
    stream: download.stream,
    contentType:
      normalizeMimeType(download.contentType) ||
      row.fileMimeType ||
      "application/octet-stream",
    size: download.size > 0 ? download.size : row.fileSizeBytes,
    fileName: row.fileName,
  };
}

export async function deleteRegulationBlobIfUnreferenced(
  actor: RegulationActor,
  pathname: string,
): Promise<{ deleted: boolean }> {
  assertManageActor(actor);
  if (!isValidRegulationBlobPathname(pathname)) {
    throw new RegulationValidationError("Path file tidak valid");
  }
  const reference = await findDocumentByFilePathname(pathname);
  if (reference) {
    throw new RegulationConflictError(
      "File masih digunakan oleh dokumen Standard & Regulation.",
    );
  }
  const result = await deleteBlob(pathname);
  return { deleted: result.deleted };
}

export function isCompleteReorder(
  currentIds: readonly string[],
  orderedIds: readonly string[],
): boolean {
  if (currentIds.length !== orderedIds.length) return false;
  if (new Set(orderedIds).size !== orderedIds.length) return false;
  const current = new Set(currentIds);
  return orderedIds.every((id) => current.has(id));
}

export async function reorderRegulation(
  actor: RegulationActor,
  input: ReorderInput,
): Promise<{
  entity: "sub_kategori" | "document";
  parent_id: string;
  ordered_ids: string[];
}> {
  assertManageActor(actor);

  let currentIds: string[];
  let parentId = input.parent_id;
  if (input.entity === "sub_kategori") {
    const disiplin = getRegulationDisiplinByKey(input.parent_id);
    if (!disiplin) {
      throw new RegulationNotFoundError("Disiplin tidak ditemukan");
    }
    parentId = disiplin.key;
    currentIds = await listReorderSubKategoriIds(disiplin.key);
  } else {
    const sub = await findSubKategoriById(input.parent_id);
    if (!sub) {
      throw new RegulationNotFoundError("Sub-kategori tidak ditemukan");
    }
    currentIds = await listReorderDocumentIds(input.parent_id);
  }

  if (!isCompleteReorder(currentIds, input.ordered_ids)) {
    throw new RegulationConflictError(
      "Daftar reorder harus memuat seluruh child parent tanpa duplikat. Muat ulang data terbaru.",
    );
  }

  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      await updateSortOrders(input.entity, input.ordered_ids, actor.id, tx);
    });
  } catch (error) {
    mapWriteError(error);
  }

  return {
    entity: input.entity,
    parent_id: parentId,
    ordered_ids: [...input.ordered_ids],
  };
}
