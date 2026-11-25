import { getPgDb } from "@/lib/pg/client";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg/errors";
import {
  LearningForbiddenError,
  assertLearningManageAccess,
  assertLearningViewAccess,
} from "@/lib/learning/access";
import {
  LEARNING_PAGE_SIZE,
  LEARNING_SORT_STEP,
  LEARNING_TITLE_MAX_LENGTH,
  type LearningContentType,
} from "@/lib/learning/constants";
import {
  countContentRows,
  deleteAttachmentsByIds,
  deleteContent as deleteContentRow,
  findAttachmentByFilePathname,
  findAttachmentById,
  findCategoryById,
  findContentByThumbnailPathname,
  findCategoryByName,
  findContentById,
  insertAttachments,
  insertCategory,
  insertContent,
  listAttachmentRows,
  listCategoryRows,
  listContentRows,
  nextCategorySortOrder,
  nextContentSortOrder,
  updateAttachment,
  updateContent as updateContentRow,
  type LearningAttachmentInsert,
  type LearningAttachmentRow,
  type LearningCategoryRow,
  type LearningContentRow,
  type LearningContentUpdate,
} from "@/lib/learning/repository";
import type {
  CreateLearningCategoryInput,
  CreateLearningContentInput,
  LearningContentListQuery,
  LearningNewAttachmentInput,
  UpdateLearningContentInput,
} from "@/lib/learning/schema";
import {
  LEARNING_ATTACHMENT_MAX_BYTES,
  LEARNING_THUMBNAIL_MAX_BYTES,
  isLearningAttachmentFileName,
  isLearningAttachmentMimeTypeAllowed,
  isLearningThumbnailMimeTypeAllowed,
  isValidLearningAttachmentPathname,
  isValidLearningThumbnailPathname,
  learningBlobPathnameExtension,
  learningFileExtension,
  normalizeExternalUrl,
  normalizeMimeType,
} from "@/lib/learning/storage-path";
import { normalizeVideoUrl } from "@/lib/learning/video";
import {
  deleteBlob,
  headBlob,
  isBlobPubliclyReachable,
  openBlobDownload,
} from "@/lib/storage/blob";
import {
  deletePublicCmsBlob,
  headPublicCmsImage,
  isPublicImageReachable,
} from "@/lib/storage/public-image";

// Business rules for Building Learning Center.
//
// Trust boundary: the browser chooses a pathname, never the bytes' metadata.
// Every upload is re-read through `head()` before a row is written, the stored
// MIME/size come from that metadata, and the access mode is probed so a
// thumbnail is provably public and an attachment provably private.

export type LearningActor = {
  id: string;
  role: string;
  status: string;
};

export type LearningCategoryDto = {
  id: string;
  nama: string;
  sort_order: number;
  content_count: number;
};

export type LearningAttachmentDto = {
  id: string;
  nama: string;
  file_name: string;
  file_mime_type: string;
  file_size_bytes: number;
  sort_order: number;
};

export type LearningContentListItemDto = {
  id: string;
  type: LearningContentType;
  judul: string;
  deskripsi: string | null;
  kategori: { id: string; nama: string };
  thumbnail_url: string;
  external_url: string | null;
  sort_order: number;
  attachment_count: number;
  created_at: string;
  updated_at: string;
};

export type LearningContentDetailDto = LearningContentListItemDto & {
  video_embed_url: string | null;
  attachments: LearningAttachmentDto[];
};

export type LearningContentListResult = {
  items: LearningContentListItemDto[];
  total: number;
  page: number;
  page_size: number;
  available_categories: LearningCategoryDto[];
};

export type LearningCategoryResult = {
  category: LearningCategoryDto;
  created: boolean;
};

export type LearningAttachmentFile = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
  fileName: string;
};

export class LearningNotFoundError extends Error {
  constructor(message = "Data Building Learning Center tidak ditemukan") {
    super(message);
    this.name = "LearningNotFoundError";
  }
}

export class LearningConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningConflictError";
  }
}

export class LearningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningValidationError";
  }
}

function assertActive(actor: LearningActor): void {
  if (actor.status !== "active") {
    throw new LearningForbiddenError();
  }
}

function assertViewActor(actor: LearningActor): void {
  assertActive(actor);
  assertLearningViewAccess(actor.role);
}

function assertManageActor(actor: LearningActor): void {
  assertActive(actor);
  assertLearningManageAccess(actor.role);
}

/** Used by the upload-token route before signing a client token. */
export function ensureLearningManage(actor: LearningActor): void {
  assertManageActor(actor);
}

function normalizeJudul(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > LEARNING_TITLE_MAX_LENGTH) {
    throw new LearningValidationError(
      `Judul harus 1–${LEARNING_TITLE_MAX_LENGTH} karakter`,
    );
  }
  return normalized;
}

function normalizeDeskripsi(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length > 2000) {
    throw new LearningValidationError("Deskripsi maksimal 2.000 karakter");
  }
  return normalized.length > 0 ? normalized : null;
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
    error instanceof LearningForbiddenError ||
    error instanceof LearningNotFoundError ||
    error instanceof LearningConflictError ||
    error instanceof LearningValidationError
  ) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new LearningConflictError(
      "Data Building Learning Center sudah digunakan. Muat ulang data terbaru.",
    );
  }
  if (isForeignKeyViolation(error)) {
    throw new LearningConflictError(
      "Data terkait sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new LearningValidationError(
      "Data Building Learning Center tidak memenuhi aturan database.",
    );
  }
  throw error;
}

async function deletePrivateBlobBestEffort(pathname: string): Promise<void> {
  try {
    const result = await deleteBlob(pathname);
    if (!result.deleted && result.reason === "not-configured") {
      console.warn(
        "Building Learning Center: private blob cleanup skipped (storage not configured)",
      );
    }
  } catch (error) {
    console.error("Building Learning Center: private blob cleanup failed", error);
  }
}

async function deletePublicBlobBestEffort(pathname: string): Promise<void> {
  try {
    const result = await deletePublicCmsBlob(pathname);
    if (!result.deleted && result.reason === "not-configured") {
      console.warn(
        "Building Learning Center: public thumbnail cleanup skipped (storage not configured)",
      );
    }
  } catch (error) {
    console.error(
      "Building Learning Center: public thumbnail cleanup failed",
      error,
    );
  }
}

type VerifiedThumbnail = { pathname: string; url: string };

type VerifiedAttachment = {
  nama: string;
  fileName: string;
  pathname: string;
  fileMimeType: string;
  fileSizeBytes: number;
};

async function verifyThumbnail(
  pathnameInput: string,
): Promise<VerifiedThumbnail> {
  const pathname = pathnameInput.trim();
  if (!isValidLearningThumbnailPathname(pathname)) {
    throw new LearningValidationError("Path thumbnail tidak valid");
  }

  const metadata = await headPublicCmsImage(pathname);
  if (!metadata || metadata.pathname !== pathname) {
    throw new LearningValidationError(
      "Thumbnail tidak ditemukan. Unggah ulang gambar.",
    );
  }
  if (metadata.size <= 0 || metadata.size > LEARNING_THUMBNAIL_MAX_BYTES) {
    // Over-limit bytes never become a record: remove the object first.
    await deletePublicBlobBestEffort(pathname);
    throw new LearningValidationError("Ukuran thumbnail maksimal 5 MB.");
  }

  const extension = learningFileExtension(pathname.split("/").pop() ?? "");
  if (
    !extension ||
    !isLearningThumbnailMimeTypeAllowed(extension, metadata.contentType)
  ) {
    throw new LearningValidationError(
      "Tipe file thumbnail tidak sesuai dengan formatnya.",
    );
  }

  // A thumbnail is rendered directly by the browser, so it MUST be public.
  const reachable = await isPublicImageReachable(metadata.url);
  if (reachable !== true) {
    throw new LearningValidationError(
      "Thumbnail harus tersimpan pada penyimpanan publik yang dapat diakses.",
    );
  }

  return { pathname, url: metadata.url };
}

async function verifyAttachment(
  input: LearningNewAttachmentInput,
): Promise<VerifiedAttachment> {
  const nama = input.nama.trim();
  if (nama.length === 0 || nama.length > 255) {
    throw new LearningValidationError("Nama lampiran harus 1–255 karakter");
  }

  const fileName = input.file_name.trim();
  const pathname = input.file_pathname.trim();

  if (!isLearningAttachmentFileName(fileName)) {
    throw new LearningValidationError(
      "Format lampiran harus PDF, Word, Excel, PowerPoint, atau ZIP",
    );
  }
  if (!isValidLearningAttachmentPathname(pathname)) {
    throw new LearningValidationError("Path lampiran tidak valid");
  }

  const nameExtension = learningFileExtension(fileName);
  const pathExtension = learningBlobPathnameExtension(pathname);
  if (!nameExtension || nameExtension !== pathExtension) {
    throw new LearningValidationError(
      "Path lampiran tidak sesuai dengan nama file",
    );
  }

  const metadata = await headBlob(pathname);
  if (!metadata || metadata.pathname !== pathname) {
    throw new LearningValidationError(
      "File lampiran tidak ditemukan. Unggah ulang file.",
    );
  }
  if (metadata.size <= 0 || metadata.size > LEARNING_ATTACHMENT_MAX_BYTES) {
    // Over-limit bytes never become a record: remove the object first.
    await deletePrivateBlobBestEffort(pathname);
    throw new LearningValidationError("Ukuran lampiran maksimal 20 MB.");
  }

  const mimeType = normalizeMimeType(metadata.contentType);
  if (!isLearningAttachmentMimeTypeAllowed(nameExtension, mimeType)) {
    throw new LearningValidationError(
      "Tipe file lampiran tidak sesuai dengan formatnya.",
    );
  }

  // Attachments are served only through the authenticated download route.
  const reachable = await isBlobPubliclyReachable(metadata.url);
  if (reachable === true) {
    throw new LearningValidationError(
      "Lampiran harus tersimpan pada penyimpanan privat.",
    );
  }

  return {
    nama,
    fileName,
    pathname,
    fileMimeType: mimeType,
    fileSizeBytes: metadata.size,
  };
}

function resolveMedia(
  type: LearningContentType,
  videoInput: string | null | undefined,
  externalInput: string | null | undefined,
): { videoUrl: string | null; externalUrl: string | null } {
  if (type === "sharing") {
    if (externalInput) {
      throw new LearningValidationError(
        "Sharing Session tidak memakai link eksternal",
      );
    }
    if (!videoInput) {
      throw new LearningValidationError(
        "URL video wajib diisi untuk Sharing Session",
      );
    }
    const video = normalizeVideoUrl(videoInput);
    if (!video) {
      throw new LearningValidationError(
        "URL video harus berupa tautan YouTube atau Vimeo yang valid",
      );
    }
    return { videoUrl: video.embedUrl, externalUrl: null };
  }

  if (videoInput) {
    throw new LearningValidationError(
      "Training dan Certificate tidak memakai video embed",
    );
  }
  if (!externalInput) {
    throw new LearningValidationError(
      "Link eksternal wajib diisi untuk Training dan Certificate",
    );
  }
  const external = normalizeExternalUrl(externalInput);
  if (!external) {
    throw new LearningValidationError(
      "Link eksternal harus berupa URL http(s) yang valid",
    );
  }
  return { videoUrl: null, externalUrl: external };
}

function toCategoryDto(row: LearningCategoryRow): LearningCategoryDto {
  return {
    id: row.id,
    nama: row.nama,
    sort_order: row.sortOrder,
    content_count: row.contentCount,
  };
}

function toAttachmentDto(row: LearningAttachmentRow): LearningAttachmentDto {
  return {
    id: row.id,
    nama: row.nama,
    file_name: row.fileName,
    file_mime_type: row.fileMimeType,
    file_size_bytes: row.fileSizeBytes,
    sort_order: row.sortOrder,
  };
}

function toListItem(
  row: LearningContentRow,
  attachmentCount: number,
): LearningContentListItemDto {
  return {
    id: row.id,
    type: row.type as LearningContentType,
    judul: row.judul,
    deskripsi: row.deskripsi,
    kategori: { id: row.kategoriId, nama: row.kategoriNama },
    thumbnail_url: row.thumbnailUrl,
    external_url: row.externalUrl,
    sort_order: row.sortOrder,
    attachment_count: attachmentCount,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

async function loadContentDetail(
  id: string,
): Promise<LearningContentDetailDto> {
  const row = await findContentById(id);
  if (!row) {
    throw new LearningNotFoundError("Konten tidak ditemukan");
  }
  const attachments = await listAttachmentRows(id);
  return {
    ...toListItem(row, attachments.length),
    video_embed_url: row.videoUrl,
    attachments: attachments.map(toAttachmentDto),
  };
}

export async function listLearningContents(
  actor: LearningActor,
  query: LearningContentListQuery,
): Promise<LearningContentListResult> {
  assertViewActor(actor);

  const page = query.page ?? 1;
  const [rows, total, categories] = await Promise.all([
    listContentRows({
      type: query.type,
      categoryId: query.category,
      search: query.q,
      limit: LEARNING_PAGE_SIZE,
      offset: (page - 1) * LEARNING_PAGE_SIZE,
    }),
    countContentRows({
      type: query.type,
      categoryId: query.category,
      search: query.q,
    }),
    listCategoryRows(),
  ]);

  return {
    items: rows.map((row) => toListItem(row, row.attachmentCount)),
    total,
    page,
    page_size: LEARNING_PAGE_SIZE,
    available_categories: categories.map(toCategoryDto),
  };
}

export async function getLearningContent(
  actor: LearningActor,
  id: string,
): Promise<LearningContentDetailDto> {
  assertViewActor(actor);
  return loadContentDetail(id);
}

export async function createLearningContent(
  actor: LearningActor,
  input: CreateLearningContentInput,
): Promise<LearningContentDetailDto> {
  assertManageActor(actor);

  const judul = normalizeJudul(input.judul);
  const deskripsi = normalizeDeskripsi(input.deskripsi);

  const category = await findCategoryById(input.kategori_id);
  if (!category) {
    throw new LearningNotFoundError("Kategori tidak ditemukan");
  }

  const media = resolveMedia(input.type, input.video_url, input.external_url);
  const thumbnail = await verifyThumbnail(input.thumbnail_pathname);

  const attachmentInputs = input.attachments ?? [];
  if (input.type !== "sharing" && attachmentInputs.length > 0) {
    throw new LearningValidationError(
      "Lampiran hanya tersedia untuk Sharing Session",
    );
  }
  const verifiedAttachments: VerifiedAttachment[] = [];
  for (const item of attachmentInputs) {
    verifiedAttachments.push(await verifyAttachment(item));
  }

  const db = getPgDb();
  let contentId: string;
  try {
    contentId = await db.transaction(async (tx) => {
      const sortOrder = await nextContentSortOrder(input.type, tx);
      const id = await insertContent(
        {
          type: input.type,
          judul,
          deskripsi,
          kategoriId: category.id,
          thumbnailUrl: thumbnail.url,
          thumbnailPathname: thumbnail.pathname,
          videoUrl: media.videoUrl,
          externalUrl: media.externalUrl,
          sortOrder,
          createdBy: actor.id,
        },
        tx,
      );

      if (verifiedAttachments.length > 0) {
        const rows: LearningAttachmentInsert[] = verifiedAttachments.map(
          (item, index) => ({
            contentId: id,
            contentType: "sharing",
            nama: item.nama,
            filePathname: item.pathname,
            fileName: item.fileName,
            fileMimeType: item.fileMimeType,
            fileSizeBytes: item.fileSizeBytes,
            sortOrder: (index + 1) * LEARNING_SORT_STEP,
            createdBy: actor.id,
          }),
        );
        await insertAttachments(rows, tx);
      }

      return id;
    });
  } catch (error) {
    mapWriteError(error);
  }

  return loadContentDetail(contentId);
}

export async function updateLearningContent(
  actor: LearningActor,
  id: string,
  input: UpdateLearningContentInput,
): Promise<LearningContentDetailDto> {
  assertManageActor(actor);

  const current = await findContentById(id);
  if (!current) {
    throw new LearningNotFoundError("Konten tidak ditemukan");
  }
  if (input.type !== undefined && input.type !== current.type) {
    throw new LearningValidationError("Tipe konten tidak dapat diubah");
  }
  const type = current.type as LearningContentType;

  const patch: LearningContentUpdate = { updatedBy: actor.id };
  if (input.judul !== undefined) patch.judul = normalizeJudul(input.judul);
  if (input.deskripsi !== undefined) {
    patch.deskripsi = normalizeDeskripsi(input.deskripsi);
  }
  if (input.kategori_id !== undefined) {
    const category = await findCategoryById(input.kategori_id);
    if (!category) {
      throw new LearningNotFoundError("Kategori tidak ditemukan");
    }
    patch.kategoriId = category.id;
  }

  // Media is recomputed only when the caller sent one of the two URLs, so a
  // metadata-only PATCH can never silently drop the existing embed/link.
  if (input.video_url !== undefined || input.external_url !== undefined) {
    if (type === "sharing") {
      if (input.external_url !== undefined && input.external_url !== null) {
        throw new LearningValidationError(
          "Sharing Session tidak memakai link eksternal",
        );
      }
      const nextVideo =
        input.video_url !== undefined ? input.video_url : current.videoUrl;
      if (!nextVideo) {
        throw new LearningValidationError(
          "URL video wajib diisi untuk Sharing Session",
        );
      }
      const video = normalizeVideoUrl(nextVideo);
      if (!video) {
        throw new LearningValidationError(
          "URL video harus berupa tautan YouTube atau Vimeo yang valid",
        );
      }
      patch.videoUrl = video.embedUrl;
      patch.externalUrl = null;
    } else {
      if (input.video_url !== undefined && input.video_url !== null) {
        throw new LearningValidationError(
          "Training dan Certificate tidak memakai video embed",
        );
      }
      const nextExternal =
        input.external_url !== undefined
          ? input.external_url
          : current.externalUrl;
      if (!nextExternal) {
        throw new LearningValidationError(
          "Link eksternal wajib diisi untuk Training dan Certificate",
        );
      }
      const external = normalizeExternalUrl(nextExternal);
      if (!external) {
        throw new LearningValidationError(
          "Link eksternal harus berupa URL http(s) yang valid",
        );
      }
      patch.externalUrl = external;
      patch.videoUrl = null;
    }
  }

  let oldThumbnailPathname: string | null = null;
  if (input.thumbnail_pathname !== undefined) {
    const verified = await verifyThumbnail(input.thumbnail_pathname);
    if (verified.pathname !== current.thumbnailPathname) {
      oldThumbnailPathname = current.thumbnailPathname;
      patch.thumbnailPathname = verified.pathname;
      patch.thumbnailUrl = verified.url;
    }
  }

  // Attachments are a replace-set: the array sent becomes the final list.
  // Existing rows are referenced by id (the API never exposes pathnames) and
  // new files by their uploaded pathname. Rows that disappear are deleted after
  // commit, and their blobs are removed best-effort once it succeeded.
  const existingAttachments =
    input.attachments !== undefined ? await listAttachmentRows(id) : [];
  const existingById = new Map(
    existingAttachments.map((row) => [row.id, row]),
  );
  const existingByPathname = new Map(
    existingAttachments.map((row) => [row.filePathname, row]),
  );
  const removedAttachmentIds: string[] = [];
  const removedAttachmentPaths: string[] = [];
  const keptAttachments: { id: string; nama: string; sortOrder: number }[] = [];
  const newAttachments: LearningAttachmentInsert[] = [];

  if (input.attachments !== undefined) {
    if (type !== "sharing" && input.attachments.length > 0) {
      throw new LearningValidationError(
        "Lampiran hanya tersedia untuk Sharing Session",
      );
    }

    const keptIds = new Set<string>();
    const seenPathnames = new Set<string>();

    for (const [index, item] of input.attachments.entries()) {
      const sortOrder = (index + 1) * LEARNING_SORT_STEP;

      if ("id" in item) {
        if (keptIds.has(item.id)) {
          throw new LearningValidationError(
            "Daftar lampiran berisi file yang sama",
          );
        }
        const existing = existingById.get(item.id);
        if (!existing) {
          throw new LearningValidationError(
            "Lampiran tidak ditemukan pada konten ini",
          );
        }
        keptIds.add(existing.id);
        const nama = item.nama.trim();
        if (existing.nama !== nama || existing.sortOrder !== sortOrder) {
          keptAttachments.push({ id: existing.id, nama, sortOrder });
        }
        continue;
      }

      const pathname = item.file_pathname.trim();
      if (seenPathnames.has(pathname)) {
        throw new LearningValidationError(
          "Daftar lampiran berisi file yang sama",
        );
      }
      seenPathnames.add(pathname);

      const existing = existingByPathname.get(pathname);
      if (existing) {
        keptIds.add(existing.id);
        const nama = item.nama.trim();
        if (existing.nama !== nama || existing.sortOrder !== sortOrder) {
          keptAttachments.push({ id: existing.id, nama, sortOrder });
        }
        continue;
      }

      const verified = await verifyAttachment(item);
      newAttachments.push({
        contentId: id,
        contentType: "sharing",
        nama: verified.nama,
        filePathname: verified.pathname,
        fileName: verified.fileName,
        fileMimeType: verified.fileMimeType,
        fileSizeBytes: verified.fileSizeBytes,
        sortOrder,
        createdBy: actor.id,
      });
    }

    for (const row of existingAttachments) {
      if (!keptIds.has(row.id)) {
        removedAttachmentIds.push(row.id);
        removedAttachmentPaths.push(row.filePathname);
      }
    }
  }

  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      const updated = await updateContentRow(id, patch, tx);
      if (!updated) {
        throw new LearningNotFoundError("Konten tidak ditemukan");
      }
      if (removedAttachmentIds.length > 0) {
        await deleteAttachmentsByIds(removedAttachmentIds, tx);
      }
      for (const item of keptAttachments) {
        await updateAttachment(
          item.id,
          { nama: item.nama, sortOrder: item.sortOrder },
          tx,
        );
      }
      if (newAttachments.length > 0) {
        await insertAttachments(newAttachments, tx);
      }
    });
  } catch (error) {
    mapWriteError(error);
  }

  if (oldThumbnailPathname) {
    await deletePublicBlobBestEffort(oldThumbnailPathname);
  }
  for (const pathname of removedAttachmentPaths) {
    await deletePrivateBlobBestEffort(pathname);
  }

  return loadContentDetail(id);
}

export async function deleteLearningContent(
  actor: LearningActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageActor(actor);

  const current = await findContentById(id);
  if (!current) {
    throw new LearningNotFoundError("Konten tidak ditemukan");
  }
  const attachments = await listAttachmentRows(id);

  const db = getPgDb();
  try {
    await db.transaction(async (tx) => {
      // Attachments cascade with the parent (composite FK ON DELETE CASCADE).
      const deleted = await deleteContentRow(id, tx);
      if (!deleted) {
        throw new LearningNotFoundError("Konten tidak ditemukan");
      }
    });
  } catch (error) {
    mapWriteError(error);
  }

  await deletePublicBlobBestEffort(current.thumbnailPathname);
  for (const row of attachments) {
    await deletePrivateBlobBestEffort(row.filePathname);
  }

  return { deleted: true, id };
}

export async function listLearningCategories(
  actor: LearningActor,
): Promise<LearningCategoryDto[]> {
  assertViewActor(actor);
  const rows = await listCategoryRows();
  return rows.map(toCategoryDto);
}

/**
 * Find-or-create by `lower(btrim(nama))`. Reusing the existing row keeps the
 * vocabulary consistent (`ERP` and ` erp ` are the same category) and avoids a
 * duplicate-name conflict the Admin cannot resolve from the content form.
 */
export async function findOrCreateLearningCategory(
  actor: LearningActor,
  input: CreateLearningCategoryInput,
): Promise<LearningCategoryResult> {
  assertManageActor(actor);

  const nama = input.nama.trim();
  if (nama.length === 0 || nama.length > 80) {
    throw new LearningValidationError("Nama kategori harus 1–80 karakter");
  }

  const existing = await findCategoryByName(nama);
  if (existing) {
    return { category: toCategoryDto(existing), created: false };
  }

  try {
    const sortOrder = input.sort_order ?? (await nextCategorySortOrder());
    const id = await insertCategory({
      nama,
      sortOrder,
      createdBy: actor.id,
    });
    const created = await findCategoryById(id);
    if (!created) {
      throw new LearningNotFoundError("Kategori tidak ditemukan");
    }
    return { category: toCategoryDto(created), created: true };
  } catch (error) {
    // Two Admins can submit the same new name concurrently; the unique index
    // decides the winner and the loser reuses that row.
    if (isUniqueViolation(error)) {
      const raced = await findCategoryByName(nama);
      if (raced) {
        return { category: toCategoryDto(raced), created: false };
      }
    }
    mapWriteError(error);
  }
}

/**
 * Orphan cleanup for the browser upload pipeline: one pathname, and only when
 * no row references it. Thumbnails live in the PUBLIC store, attachments in the
 * PRIVATE one, so the delete target follows the namespace.
 */
export async function deleteLearningBlobIfUnreferenced(
  actor: LearningActor,
  pathname: string,
): Promise<{ deleted: boolean }> {
  assertManageActor(actor);

  const target = pathname.trim();
  if (isValidLearningThumbnailPathname(target)) {
    const reference = await findContentByThumbnailPathname(target);
    if (reference) {
      throw new LearningConflictError(
        "Thumbnail masih digunakan oleh konten Building Learning Center.",
      );
    }
    const result = await deletePublicCmsBlob(target);
    return { deleted: result.deleted };
  }

  if (isValidLearningAttachmentPathname(target)) {
    const reference = await findAttachmentByFilePathname(target);
    if (reference) {
      throw new LearningConflictError(
        "Lampiran masih digunakan oleh konten Building Learning Center.",
      );
    }
    const result = await deleteBlob(target);
    return { deleted: result.deleted };
  }

  throw new LearningValidationError("Path file tidak valid");
}

export async function getLearningAttachmentFile(
  actor: LearningActor,
  id: string,
): Promise<LearningAttachmentFile> {
  assertViewActor(actor);

  const row = await findAttachmentById(id);
  if (!row) {
    throw new LearningNotFoundError("Lampiran tidak ditemukan");
  }

  const download = await openBlobDownload(row.filePathname);
  if (!download) {
    throw new LearningNotFoundError("File lampiran tidak tersedia.");
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
