import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import {
  canCreateBerkas,
  canDeleteBerkas,
  canDownloadBerkas,
  canValidateBerkas,
  canViewBerkas,
} from "@/lib/berkas/access";
import {
  clearBerkasValidasiTtdRows,
  deleteBerkasRow,
  findBerkasDeletionRowById,
  findBerkasDetailRowById,
  findBerkasDownloadRowById,
  findBerkasFileRowById,
  findBerkasForUpdate,
  findBerkasValidasiRowsForUpdate,
  insertBerkasWithChildren,
  listBerkasAssignmentsByUser,
  listBerkasPage as listBerkasPageRows,
  updateBerkasRejectionRow,
  updateBerkasRevisionRow,
  updateBerkasStatusRow,
  updateBerkasValidasiTtdRow,
  type BerkasDetailRow,
  type BerkasListRow,
  type BerkasValidasiRow,
} from "@/lib/berkas/repository";
import {
  applyWatermark,
  generateCoverPdf,
  mergePdf,
  type BerkasCoverSignature,
  type GenerateCoverPdfData,
} from "@/lib/berkas/pdf-engine";
import {
  isValidBerkasUploadPathname,
  parseBerkasUploadPathname,
  parseBerkasValidationTtdPathname,
  sanitizeBerkasFileName,
  type BerkasValidationRole,
} from "@/lib/berkas/storage-path";
import type {
  CreateBerkasInput,
  RejectBerkasInput,
  RevisiBerkasInput,
} from "@/lib/berkas/schema";
import { getPgDb } from "@/lib/pg/client";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/pg/errors";
import type { BerkasStatus } from "@/lib/pg/schema";
import {
  deleteBlob,
  isBlobPubliclyReachable,
  headBlob,
  openBlobDownload,
  putPrivateBlob,
  type BlobObjectMetadata,
} from "@/lib/storage/blob";
import {
  findUserById,
  listUsers as listUserRows,
} from "@/lib/users/repository";
import {
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  MANAGEMENT_ROLE,
  hasRole,
  isAdmin,
  isProject,
} from "@/lib/users/roles";

// Server-only business rules for Berkas. Routes never bypass this layer:
// permission, ownership filter, blob verification, snapshots and the state
// machine all live here.

export type BerkasActor = {
  id: string;
  role: string;
  status: string;
  nip: string | null;
};

export type BerkasListItem = {
  id: string;
  judul: string;
  kodeSeri: string | null;
  catatan: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  revisionCount: number;
  pemohon: { id: string; name: string };
  originalPdf: { name: string; sizeBytes: number };
  status: BerkasStatus;
  version: number;
  submittedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BerkasPenyusunDto = {
  id: string;
  userId: string;
  nama: string;
  jabatan: string;
  urutan: number;
  ttdUploadedAt: string;
};

export type BerkasValidasiDto = {
  id: string;
  userId: string;
  nama: string;
  jabatan: string;
  urutan: number;
  ttdUploadedAt: string | null;
};

export type BerkasDetail = BerkasListItem & {
  penyusun: BerkasPenyusunDto[];
  validasi: BerkasValidasiDto[];
};

export type BerkasFile = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
  fileName: string;
};

export type BerkasDownload = {
  bytes: Uint8Array;
  fileName: string;
};

export type BerkasUserOption = {
  id: string;
  name: string;
  position: string;
};

export type BerkasAssignment = {
  berkasId: string;
  urutan: number;
  ttdUploadedAt: string | null;
};

export type BerkasPage = {
  data: BerkasListItem[];
  page: number;
  limit: number;
  totalData: number;
  totalPages: number;
};

export class BerkasForbiddenError extends Error {
  constructor(message = "Akses Berkas ditolak") {
    super(message);
    this.name = "BerkasForbiddenError";
  }
}

export class BerkasNotFoundError extends Error {
  constructor(message = "Berkas tidak ditemukan") {
    super(message);
    this.name = "BerkasNotFoundError";
  }
}

export class BerkasConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BerkasConflictError";
  }
}

export class BerkasValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BerkasValidationError";
  }
}

export class BerkasPdfError extends Error {
  constructor(message = "Gagal memproses PDF Berkas") {
    super(message);
    this.name = "BerkasPdfError";
  }
}

const ORIGINAL_PDF_MAX_BYTES = 20 * 1024 * 1024;
const GENERATED_PDF_MAX_BYTES = 32 * 1024 * 1024;
const TTD_MAX_BYTES = 2 * 1024 * 1024;
const ORIGINAL_PDF_MIME = "application/pdf";
const TTD_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

const ALLOWED_TRANSITIONS: Record<BerkasStatus, readonly BerkasStatus[]> = {
  MENUNGGU_TTD_1: ["MENUNGGU_TTD_2", "DITOLAK"],
  MENUNGGU_TTD_2: ["SELESAI", "DITOLAK"],
  DITOLAK: ["MENUNGGU_TTD_1"],
  SELESAI: [],
};

const VALIDATOR_ROLES = [
  ADMIN_ROLE,
  HEAD_OFFICE_ROLE,
  MANAGEMENT_ROLE,
] as const;

function isEligibleValidatorRole(role: string): boolean {
  return hasRole(role, ...VALIDATOR_ROLES);
}

function assertTransition(from: BerkasStatus, to: BerkasStatus): void {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new BerkasConflictError("Transisi status Berkas tidak valid");
  }
}

function assertActive(actor: BerkasActor): void {
  if (actor.status !== "active") {
    throw new BerkasForbiddenError();
  }
}

function assertViewAccess(actor: BerkasActor): void {
  assertActive(actor);
  if (!canViewBerkas(actor.role)) {
    throw new BerkasForbiddenError();
  }
}

function assertCreateAccess(actor: BerkasActor): void {
  assertActive(actor);
  if (!canCreateBerkas(actor.role)) {
    throw new BerkasForbiddenError();
  }
}

function assertValidateAccess(actor: BerkasActor): void {
  assertActive(actor);
  if (!canValidateBerkas(actor.role)) {
    throw new BerkasForbiddenError();
  }
}

function assertDownloadAccess(actor: BerkasActor): void {
  assertActive(actor);
  if (!canDownloadBerkas(actor.role)) {
    throw new BerkasForbiddenError();
  }
}

function assertDeleteAccess(actor: BerkasActor): void {
  assertActive(actor);
  if (!canDeleteBerkas(actor.role)) {
    throw new BerkasForbiddenError("Hanya Admin yang dapat menghapus Berkas");
  }
}

function assertRowVisible(actor: BerkasActor, pemohonId: string): void {
  if (isProject(actor.role) && pemohonId !== actor.id) {
    throw new BerkasNotFoundError();
  }
}

function normalizeMimeType(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  const normalized = value.split(";")[0]?.trim().toLowerCase() ?? "";
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toListItem(row: BerkasListRow): BerkasListItem {
  return {
    id: row.id,
    judul: row.judul,
    kodeSeri: row.kodeSeri,
    catatan: row.catatan,
    rejectionReason: row.rejectionReason,
    rejectedAt: toIso(row.rejectedAt),
    revisionCount: row.revisionCount,
    pemohon: { id: row.pemohonId, name: row.pemohonName },
    originalPdf: {
      name: row.originalPdfName,
      sizeBytes: row.originalPdfSizeBytes,
    },
    status: row.status as BerkasStatus,
    version: row.version,
    submittedAt: row.submittedAt.toISOString(),
    completedAt: toIso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: BerkasDetailRow): BerkasDetail {
  return {
    ...toListItem(row),
    penyusun: row.penyusun.map((item) => ({
      id: item.id,
      userId: item.userId,
      nama: item.namaSnapshot,
      jabatan: item.jabatanSnapshot,
      urutan: item.urutan,
      ttdUploadedAt: item.ttdUploadedAt.toISOString(),
    })),
    validasi: row.validasi.map((item) => ({
      id: item.id,
      userId: item.validatorUserId,
      nama: item.namaSnapshot,
      jabatan: item.jabatanSnapshot,
      urutan: item.urutan,
      ttdUploadedAt: toIso(item.ttdUploadedAt),
    })),
  };
}

function hasSqlState(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  if ((error as { code?: unknown }).code === code) {
    return true;
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : hasSqlState(cause, code, depth + 1);
}

function sqlConstraint(error: unknown, depth = 0): string | null {
  if (depth > 3 || typeof error !== "object" || error === null) return null;
  const value = error as {
    constraint?: unknown;
    constraint_name?: unknown;
    message?: unknown;
  };
  if (typeof value.constraint === "string") return value.constraint;
  if (typeof value.constraint_name === "string") return value.constraint_name;
  if (typeof value.message === "string") {
    for (const name of [
      "berkas_pengajuan_original_pdf_pathname_unique",
      "berkas_pengajuan_generated_pdf_pathname_unique",
      "berkas_penyusun_ttd_pathname_unique",
      "berkas_validasi_ttd_pathname_unique",
    ]) {
      if (value.message.includes(name)) return name;
    }
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? null : sqlConstraint(cause, depth + 1);
}

/** Never delete a pathname that another record may already own. */
function isReusedPathnameViolation(error: unknown): boolean {
  const constraint = sqlConstraint(error);
  return (
    constraint === "berkas_pengajuan_original_pdf_pathname_unique" ||
    constraint === "berkas_pengajuan_generated_pdf_pathname_unique" ||
    constraint === "berkas_penyusun_ttd_pathname_unique" ||
    constraint === "berkas_validasi_ttd_pathname_unique"
  );
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof BerkasForbiddenError ||
    error instanceof BerkasNotFoundError ||
    error instanceof BerkasConflictError ||
    error instanceof BerkasValidationError ||
    error instanceof BerkasPdfError
  ) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new BerkasConflictError(
      "File atau data Berkas sudah digunakan. Muat ulang data terbaru.",
    );
  }
  if (isForeignKeyViolation(error)) {
    throw new BerkasConflictError(
      "User terkait sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new BerkasValidationError(
      "Data Berkas tidak memenuhi aturan database.",
    );
  }
  throw error;
}

async function requireActiveUser(userId: string, label: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new BerkasValidationError(`${label} tidak ditemukan`);
  }
  if (user.status !== "active") {
    throw new BerkasValidationError(`${label} tidak aktif`);
  }
  return user;
}

async function verifyPrivateBlob(
  pathname: string,
  allowedMimeTypes: ReadonlySet<string>,
  maxBytes: number,
  label: string,
): Promise<{ blob: BlobObjectMetadata; mimeType: string }> {
  const blob = await headBlob(pathname);
  if (!blob || blob.pathname !== pathname) {
    throw new BerkasValidationError(`${label} tidak ditemukan`);
  }
  if (blob.size <= 0 || blob.size > maxBytes) {
    throw new BerkasValidationError(`${label} melebihi batas ukuran`);
  }
  const mimeType = normalizeMimeType(blob.contentType);
  if (!allowedMimeTypes.has(mimeType)) {
    throw new BerkasValidationError(`Tipe file ${label} tidak didukung`);
  }
  const publiclyReachable = await isBlobPubliclyReachable(blob.url);
  if (publiclyReachable === true) {
    throw new BerkasValidationError(`${label} harus disimpan secara privat`);
  }
  return { blob, mimeType };
}

async function readPrivateBlobBytes(
  pathname: string,
  label: string,
): Promise<Uint8Array> {
  const download = await openBlobDownload(pathname);
  if (!download) {
    throw new BerkasNotFoundError(`${label} tidak ditemukan`);
  }
  const buffer = await new Response(download.stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/** Best-effort blob cleanup. It never throws and never logs pathname values. */
export async function cleanupBerkasBlobs(
  pathnames: string[],
  context: {
    operation: "create" | "revisi" | "ttd" | "delete";
    berkasId?: string;
  },
): Promise<void> {
  const unique = [...new Set(pathnames.filter((pathname) => pathname.trim()))];
  if (unique.length === 0) return;

  const results = await Promise.allSettled(
    unique.map((pathname) => deleteBlob(pathname)),
  );
  const failed = results.filter((result) => result.status === "rejected").length;
  const skipped = results.filter(
    (result) =>
      result.status === "fulfilled" && result.value.reason !== "deleted",
  ).length;

  if (failed > 0 || skipped > 0) {
    console.warn("Berkas blob cleanup incomplete", {
      operation: context.operation,
      berkasId: context.berkasId,
      failed,
      skipped,
      total: unique.length,
    });
  }
}

async function readPdfPageCount(
  bytes: Uint8Array,
  label: string,
): Promise<number> {
  try {
    const document = await PDFDocument.load(bytes);
    const pageCount = document.getPageCount();
    if (pageCount < 1 || pageCount > 200) {
      throw new BerkasValidationError(`${label} harus memiliki 1–200 halaman`);
    }
    return pageCount;
  } catch (error) {
    if (error instanceof BerkasValidationError) throw error;
    throw new BerkasValidationError(
      `${label} bukan PDF yang valid atau file terenkripsi`,
    );
  }
}

function findValidationAssignment(
  detail: BerkasDetailRow,
  actorId: string,
): BerkasValidasiRow {
  const assignment = detail.validasi.find(
    (item) => item.validatorUserId === actorId,
  );
  if (!assignment) {
    throw new BerkasForbiddenError("Anda bukan validator untuk Berkas ini");
  }
  return assignment;
}

function assertTtdWindow(
  status: BerkasStatus,
  assignment: BerkasValidasiRow,
): void {
  if (status === "SELESAI") {
    throw new BerkasConflictError("Berkas sudah selesai");
  }
  if (assignment.urutan === 1) {
    if (status !== "MENUNGGU_TTD_1" || assignment.ttdPathname) {
      throw new BerkasConflictError(
        "TTD Validator 1 sudah diunggah atau status Berkas tidak sesuai",
      );
    }
    return;
  }
  if (assignment.urutan !== 2) {
    throw new BerkasConflictError("Urutan validator tidak valid");
  }
  if (status !== "MENUNGGU_TTD_2" || assignment.ttdPathname) {
    throw new BerkasConflictError(
      "TTD Validator 1 harus selesai sebelum TTD Validator 2",
    );
  }
}

function assertValidationPath(
  pathname: string,
  berkasId: string,
  urutan: number,
): void {
  const parsed = parseBerkasValidationTtdPathname(pathname);
  if (
    !parsed ||
    parsed.berkasId !== berkasId ||
    parsed.role !== String(urutan)
  ) {
    throw new BerkasValidationError(
      "Path TTD tidak sesuai dengan Berkas dan urutan validator",
    );
  }
}

async function buildCoverData(
  detail: BerkasDetailRow,
  ttd2MimeType: string,
  ttd2UploadedAt: Date,
): Promise<{
  data: GenerateCoverPdfData;
  originalPdfBytes: Uint8Array;
}> {
  if (detail.penyusun.length === 0) {
    throw new BerkasConflictError("Data penyusun Berkas tidak lengkap");
  }

  const validator1 = detail.validasi.find((item) => item.urutan === 1);
  const validator2 = detail.validasi.find((item) => item.urutan === 2);
  if (!validator1 || !validator2) {
    throw new BerkasConflictError("Data validator Berkas tidak lengkap");
  }
  if (
    !validator1.ttdPathname ||
    !validator1.ttdMimeType ||
    !validator1.ttdUploadedAt
  ) {
    throw new BerkasConflictError("TTD Validator 1 belum tersedia");
  }

  const [originalPdfBytes, penyusunBytes, validator1Bytes] = await Promise.all([
    readPrivateBlobBytes(detail.originalPdfPathname, "PDF asli"),
    Promise.all(
      detail.penyusun.map((item) =>
        readPrivateBlobBytes(item.ttdPathname, `TTD penyusun ${item.urutan}`),
      ),
    ),
    readPrivateBlobBytes(validator1.ttdPathname, "TTD Validator 1"),
  ]);

  const penyusun: BerkasCoverSignature[] = detail.penyusun.map(
    (item, index) => ({
      nama: item.namaSnapshot,
      jabatan: item.jabatanSnapshot,
      ttdBytes: penyusunBytes[index],
      ttdMimeType: item.ttdMimeType,
      ttdUploadedAt: item.ttdUploadedAt,
    }),
  );
  const validasi: [BerkasCoverSignature, BerkasCoverSignature] = [
    {
      nama: validator1.namaSnapshot,
      jabatan: validator1.jabatanSnapshot,
      ttdBytes: validator1Bytes,
      ttdMimeType: validator1.ttdMimeType,
      ttdUploadedAt: validator1.ttdUploadedAt,
    },
    {
      nama: validator2.namaSnapshot,
      jabatan: validator2.jabatanSnapshot,
      ttdBytes: null,
      ttdMimeType: ttd2MimeType,
      ttdUploadedAt: ttd2UploadedAt,
    },
  ];

  return {
    data: {
      judul: detail.judul,
      kodeSeri: detail.kodeSeri,
      penyusun,
      validasi,
    },
    originalPdfBytes,
  };
}

async function buildGeneratedPdf(
  detail: BerkasDetailRow,
  ttd2Pathname: string,
  ttd2MimeType: string,
  ttd2UploadedAt: Date,
): Promise<{ pathname: string; sizeBytes: number }> {
  const { data, originalPdfBytes } = await buildCoverData(
    detail,
    ttd2MimeType,
    ttd2UploadedAt,
  );
  const ttd2Bytes = await readPrivateBlobBytes(ttd2Pathname, "TTD Validator 2");
  data.validasi[1].ttdBytes = ttd2Bytes;

  let merged: Uint8Array;
  try {
    const cover = await generateCoverPdf(data);
    merged = await mergePdf(originalPdfBytes, cover);
  } catch {
    throw new BerkasPdfError("Gagal membuat cover dan menggabungkan PDF");
  }

  if (merged.byteLength <= 0 || merged.byteLength > GENERATED_PDF_MAX_BYTES) {
    throw new BerkasValidationError(
      "Ukuran generated PDF melebihi batas yang diizinkan",
    );
  }

  const pathname = `berkas/${detail.id}/generated/final-${randomUUID()}.pdf`;
  const blob = await putPrivateBlob(
    pathname,
    Buffer.from(merged),
    "application/pdf",
  );
  return {
    pathname,
    sizeBytes: blob.size > 0 ? blob.size : merged.byteLength,
  };
}

function downloadFileName(judul: string, id: string): string {
  const cleaned = sanitizeBerkasFileName(judul) ?? "";
  const base =
    cleaned
      .replace(/\.pdf$/i, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || `berkas-${id}`;
  const stamp = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  })
    .format(new Date())
    .replace(/-/g, "");
  return `Berkas-${base}-${stamp}.pdf`;
}

export function ensureBerkasCreate(actor: BerkasActor): void {
  assertCreateAccess(actor);
}

/**
 * Validator uploads are record-scoped: holding BERKAS_VALIDATE is not enough.
 * The actor must be assigned to the exact slot and the status machine must
 * still be waiting for that slot's signature.
 */
export async function ensureBerkasValidatorUpload(
  actor: BerkasActor,
  id: string,
  role: BerkasValidationRole,
): Promise<void> {
  assertValidateAccess(actor);
  const detail = await findBerkasDetailRowById(id);
  if (!detail) {
    throw new BerkasNotFoundError();
  }

  const assignment = findValidationAssignment(detail, actor.id);
  const expectedUrutan = role === "validasi-1" ? 1 : 2;
  if (assignment.urutan !== expectedUrutan) {
    throw new BerkasForbiddenError(
      `Anda bukan Validator ${expectedUrutan} untuk Berkas ini`,
    );
  }
  assertTtdWindow(detail.status as BerkasStatus, assignment);
}

export async function listBerkasPage(
  actor: BerkasActor,
  input: { search?: string; page: number; limit: number },
): Promise<BerkasPage> {
  assertViewAccess(actor);
  const result = await listBerkasPageRows({
    pemohonId: isProject(actor.role) ? actor.id : undefined,
    search: input.search,
    page: input.page,
    limit: input.limit,
  });
  return {
    data: result.rows.map(toListItem),
    page: input.page,
    limit: input.limit,
    totalData: result.totalData,
    totalPages:
      result.totalData === 0 ? 0 : Math.ceil(result.totalData / input.limit),
  };
}

/** Validators/penyusun may only be users whose role is allowed to validate. */
export async function listBerkasUserOptions(
  actor: BerkasActor,
): Promise<BerkasUserOption[]> {
  assertCreateAccess(actor);
  const rows = await listUserRows();
  return rows
    .filter(
      (user) =>
        user.status === "active" && isEligibleValidatorRole(user.role),
    )
    .map((user) => ({
      id: user.id,
      name: user.name,
      position: user.position,
    }));
}

/** Current viewer's validator assignments, optionally limited to a page. */
export async function listBerkasAssignments(
  actor: BerkasActor,
  berkasIds?: string[],
): Promise<BerkasAssignment[]> {
  assertViewAccess(actor);
  const rows = await listBerkasAssignmentsByUser(actor.id, berkasIds);
  return rows.map((row) => ({
    berkasId: row.berkasId,
    urutan: row.urutan,
    ttdUploadedAt: toIso(row.ttdUploadedAt),
  }));
}

export async function getBerkasById(
  actor: BerkasActor,
  id: string,
): Promise<BerkasDetail> {
  assertViewAccess(actor);
  const row = await findBerkasDetailRowById(id);
  if (!row) {
    throw new BerkasNotFoundError();
  }
  assertRowVisible(actor, row.pemohonId);
  return toDetail(row);
}

export async function getBerkasFile(
  actor: BerkasActor,
  id: string,
): Promise<BerkasFile> {
  assertViewAccess(actor);
  const row = await findBerkasFileRowById(id);
  if (!row) {
    throw new BerkasNotFoundError();
  }
  assertRowVisible(actor, row.pemohonId);

  const download = await openBlobDownload(row.originalPdfPathname);
  if (!download) {
    throw new BerkasNotFoundError("File PDF asli tidak ditemukan");
  }

  return {
    stream: download.stream,
    contentType:
      normalizeMimeType(download.contentType) ||
      row.originalPdfMimeType ||
      ORIGINAL_PDF_MIME,
    size: download.size > 0 ? download.size : row.originalPdfSizeBytes,
    fileName: row.originalPdfName,
  };
}

export async function createBerkas(
  actor: BerkasActor,
  input: CreateBerkasInput,
): Promise<BerkasDetail> {
  assertCreateAccess(actor);

  const cleanupPathnames = [
    ...(isValidBerkasUploadPathname(
      input.originalPdf.pathname,
      actor.id,
      input.uploadId,
      "original",
    )
      ? [input.originalPdf.pathname]
      : []),
    ...input.penyusun
      .filter((item) =>
        isValidBerkasUploadPathname(
          item.ttdPathname,
          actor.id,
          input.uploadId,
          "penyusun_ttd",
          item.urutan,
        ),
      )
      .map((item) => item.ttdPathname),
  ];

  async function failCreate(error: Error): Promise<never> {
    if (!isReusedPathnameViolation(error)) {
      await cleanupBerkasBlobs(cleanupPathnames, { operation: "create" });
    }
    throw error;
  }

  const penyusunUsers = await Promise.all(
    input.penyusun.map((item) =>
      requireActiveUser(item.userId, "Penyusun"),
    ),
  );
  const validatorUsers = await Promise.all(
    input.validasi.map((item) =>
      requireActiveUser(item.userId, "Validator"),
    ),
  );
  if (validatorUsers.some((user) => !isEligibleValidatorRole(user.role))) {
    return failCreate(
      new BerkasValidationError(
        "Validator harus Admin, Head Office, atau Management",
      ),
    );
  }

  if (input.penyusun.length !== 1) {
    return failCreate(new BerkasValidationError("Tepat 1 penyusun wajib diisi"));
  }
  if (input.validasi.length !== 2) {
    return failCreate(new BerkasValidationError("Tepat 2 validator wajib diisi"));
  }
  if (input.validasi[0]?.userId === input.validasi[1]?.userId) {
    return failCreate(
      new BerkasValidationError(
        "Validator 1 dan Validator 2 harus orang berbeda",
      ),
    );
  }

  if (
    !isValidBerkasUploadPathname(
      input.originalPdf.pathname,
      actor.id,
      input.uploadId,
      "original",
    )
  ) {
    return failCreate(new BerkasValidationError("Path PDF asli tidak valid"));
  }

  for (const item of input.penyusun) {
    if (
      !isValidBerkasUploadPathname(
        item.ttdPathname,
        actor.id,
        input.uploadId,
        "penyusun_ttd",
        item.urutan,
      )
    ) {
      return failCreate(
        new BerkasValidationError("Path TTD penyusun tidak valid"),
      );
    }
  }

  const allPathnames = [
    input.originalPdf.pathname,
    ...input.penyusun.map((item) => item.ttdPathname),
  ];
  if (new Set(allPathnames).size !== allPathnames.length) {
    return failCreate(
      new BerkasValidationError("Path file tidak boleh duplikat"),
    );
  }

  const originalPdfName = sanitizeBerkasFileName(input.originalPdf.fileName);
  if (!originalPdfName || !originalPdfName.toLowerCase().endsWith(".pdf")) {
    return failCreate(new BerkasValidationError("Nama file PDF tidak valid"));
  }

  let createdId: string | null = null;
  try {
    const original = await verifyPrivateBlob(
      input.originalPdf.pathname,
      new Set([ORIGINAL_PDF_MIME]),
      ORIGINAL_PDF_MAX_BYTES,
      "PDF asli",
    );
    const originalBytes = await readPrivateBlobBytes(
      input.originalPdf.pathname,
      "PDF asli",
    );
    const pageCount = await readPdfPageCount(originalBytes, "PDF asli");
    const ttdFiles = await Promise.all(
      input.penyusun.map((item) =>
        verifyPrivateBlob(
          item.ttdPathname,
          TTD_MIME_TYPES,
          TTD_MAX_BYTES,
          `TTD penyusun ${item.urutan}`,
        ),
      ),
    );

    createdId = await insertBerkasWithChildren({
      judul: input.judul,
      kodeSeri: input.kodeSeri?.trim() || null,
      pemohonId: actor.id,
      originalPdfPathname: input.originalPdf.pathname,
      originalPdfName,
      originalPdfMimeType: original.mimeType,
      originalPdfSizeBytes: original.blob.size,
      originalPdfPageCount: pageCount,
      penyusun: input.penyusun.map((item, index) => ({
        userId: item.userId,
        namaSnapshot: item.nama?.trim() || penyusunUsers[index].name,
        jabatanSnapshot: item.jabatan,
        urutan: item.urutan,
        ttdPathname: item.ttdPathname,
        ttdMimeType: ttdFiles[index].mimeType,
        ttdSizeBytes: ttdFiles[index].blob.size,
      })),
      validasi: input.validasi.map((item, index) => ({
        userId: item.userId,
        urutan: item.urutan,
        namaSnapshot: item.nama?.trim() || validatorUsers[index].name,
        jabatanSnapshot: item.jabatan,
      })),
    });
  } catch (error) {
    if (!isReusedPathnameViolation(error)) {
      await cleanupBerkasBlobs(allPathnames, { operation: "create" });
    }
    mapWriteError(error);
  }

  if (!createdId) {
    throw new BerkasConflictError("Berkas gagal dibuat");
  }
  return getBerkasById(actor, createdId);
}

/**
 * Records one validator signature. Validation is record-scoped: the actor must
 * match validator_user_id, not merely hold BERKAS_VALIDATE. Validator 2 also
 * builds the final cover + merged PDF before the database transition.
 */
export async function submitTtd(
  actor: BerkasActor,
  id: string,
  pathname: string,
  catatan: string | null,
): Promise<BerkasDetail> {
  assertValidateAccess(actor);

  const detail = await findBerkasDetailRowById(id);
  if (!detail) {
    throw new BerkasNotFoundError();
  }

  const assignment = findValidationAssignment(detail, actor.id);
  assertTtdWindow(detail.status as BerkasStatus, assignment);
  assertValidationPath(pathname, id, assignment.urutan);

  const verified = await verifyPrivateBlob(
    pathname,
    TTD_MIME_TYPES,
    TTD_MAX_BYTES,
    `TTD Validator ${assignment.urutan}`,
  ).catch(async (error) => {
    await cleanupBerkasBlobs([pathname], { operation: "ttd", berkasId: id });
    return mapWriteError(error);
  });
  const ttdUploadedAt = new Date();

  if (assignment.urutan === 1) {
    try {
      await getPgDb().transaction(async (tx) => {
        const current = await findBerkasForUpdate(id, tx);
        if (!current) throw new BerkasNotFoundError();
        if (current.version !== detail.version) {
          throw new BerkasConflictError(
            "Versi Berkas sudah berubah. Muat ulang data terbaru.",
          );
        }
        if (current.status !== "MENUNGGU_TTD_1") {
          throw new BerkasConflictError("Status Berkas tidak sesuai");
        }
        assertTransition(current.status as BerkasStatus, "MENUNGGU_TTD_2");

        const rows = await findBerkasValidasiRowsForUpdate(id, tx);
        const currentAssignment = rows.find(
          (item) => item.validatorUserId === actor.id,
        );
        if (!currentAssignment) {
          throw new BerkasForbiddenError(
            "Anda bukan validator untuk Berkas ini",
          );
        }
        if (
          currentAssignment.urutan !== 1 ||
          currentAssignment.ttdPathname
        ) {
          throw new BerkasConflictError(
            "TTD Validator 1 sudah diunggah atau urutan tidak sesuai",
          );
        }

        const child = await updateBerkasValidasiTtdRow(
          currentAssignment.id,
          {
            ttdPathname: pathname,
            ttdMimeType: verified.mimeType,
            ttdSizeBytes: verified.blob.size,
            ttdUploadedAt,
          },
          tx,
        );
        if (!child) throw new BerkasNotFoundError();

        const parent = await updateBerkasStatusRow(
          id,
          current.version,
          { status: "MENUNGGU_TTD_2", catatan },
          tx,
        );
        if (!parent) {
          throw new BerkasConflictError(
            "Versi Berkas sudah berubah. Muat ulang data terbaru.",
          );
        }
      });
    } catch (error) {
      await cleanupBerkasBlobs([pathname], { operation: "ttd", berkasId: id });
      mapWriteError(error);
    }
  } else {
    let generatedPathname: string | null = null;
    try {
      // Build bytes before touching the database so a failed generation leaves
      // status MENUNGGU_TTD_2 and the TTD slot available for a retry.
      const generated = await buildGeneratedPdf(
        detail,
        pathname,
        verified.mimeType,
        ttdUploadedAt,
      );
      generatedPathname = generated.pathname;
      const completedAt = new Date();

      await getPgDb().transaction(async (tx) => {
        const current = await findBerkasForUpdate(id, tx);
        if (!current) throw new BerkasNotFoundError();
        if (current.version !== detail.version) {
          throw new BerkasConflictError(
            "Versi Berkas sudah berubah. Muat ulang data terbaru.",
          );
        }
        if (current.status !== "MENUNGGU_TTD_2") {
          throw new BerkasConflictError("Status Berkas tidak sesuai");
        }
        assertTransition(current.status as BerkasStatus, "SELESAI");

        const rows = await findBerkasValidasiRowsForUpdate(id, tx);
        const currentAssignment = rows.find(
          (item) => item.validatorUserId === actor.id,
        );
        if (!currentAssignment) {
          throw new BerkasForbiddenError(
            "Anda bukan validator untuk Berkas ini",
          );
        }
        if (currentAssignment.urutan !== 2) {
          throw new BerkasConflictError("Urutan validator tidak sesuai");
        }
        if (currentAssignment.ttdPathname) {
          throw new BerkasConflictError("TTD Validator 2 sudah diunggah");
        }
        const validator1 = rows.find((item) => item.urutan === 1);
        if (!validator1?.ttdPathname) {
          throw new BerkasConflictError("TTD Validator 1 belum tersedia");
        }

        const child = await updateBerkasValidasiTtdRow(
          currentAssignment.id,
          {
            ttdPathname: pathname,
            ttdMimeType: verified.mimeType,
            ttdSizeBytes: verified.blob.size,
            ttdUploadedAt,
          },
          tx,
        );
        if (!child) throw new BerkasNotFoundError();

        const parent = await updateBerkasStatusRow(
          id,
          current.version,
          {
            status: "SELESAI",
            catatan,
            completedAt,
            generatedPdfPathname: generated.pathname,
            generatedPdfSizeBytes: generated.sizeBytes,
          },
          tx,
        );
        if (!parent) {
          throw new BerkasConflictError(
            "Versi Berkas sudah berubah. Muat ulang data terbaru.",
          );
        }
      });
    } catch (error) {
      // The transaction did not commit; do not leave unreferenced artifacts.
      if (generatedPathname) {
        await cleanupBerkasBlobs([generatedPathname], {
          operation: "ttd",
          berkasId: id,
        });
      }
      await cleanupBerkasBlobs([pathname], { operation: "ttd", berkasId: id });
      mapWriteError(error);
    }
  }

  // A validator may be a Project user who is not the pemohon. The assignment
  // itself is sufficient to return the updated detail here.
  const updated = await findBerkasDetailRowById(id);
  if (!updated) throw new BerkasNotFoundError();
  return toDetail(updated);
}

/**
 * Admin-only hard delete. The database row is removed first (children cascade
 * with the parent); blob cleanup runs afterwards as best-effort so a storage
 * hiccup can never keep or resurrect the metadata.
 */
export async function deleteBerkas(
  actor: BerkasActor,
  id: string,
): Promise<{ id: string }> {
  assertDeleteAccess(actor);

  const row = await findBerkasDeletionRowById(id);
  if (!row) {
    throw new BerkasNotFoundError();
  }

  try {
    const deleted = await deleteBerkasRow(id);
    if (!deleted) {
      throw new BerkasNotFoundError();
    }
  } catch (error) {
    mapWriteError(error);
  }

  const pathnames = [
    row.originalPdfPathname,
    ...(row.generatedPdfPathname ? [row.generatedPdfPathname] : []),
    ...row.penyusunTtdPathnames,
    ...row.validasiTtdPathnames,
  ];
  await cleanupBerkasBlobs(pathnames, { operation: "delete", berkasId: id });

  return { id };
}

export async function rejectBerkas(
  actor: BerkasActor,
  id: string,
  input: RejectBerkasInput,
): Promise<BerkasDetail> {
  assertActive(actor);

  const detail = await findBerkasDetailRowById(id);
  if (!detail) {
    throw new BerkasNotFoundError();
  }

  const status = detail.status as BerkasStatus;
  if (status !== "MENUNGGU_TTD_1" && status !== "MENUNGGU_TTD_2") {
    throw new BerkasConflictError("Berkas tidak berada pada tahap validasi");
  }

  if (!isAdmin(actor.role)) {
    assertValidateAccess(actor);
    const assignment = detail.validasi.find(
      (item) => item.validatorUserId === actor.id,
    );
    const expectedUrutan = status === "MENUNGGU_TTD_1" ? 1 : 2;
    if (!assignment || assignment.urutan !== expectedUrutan) {
      throw new BerkasForbiddenError(
        `Anda bukan Validator ${expectedUrutan} untuk Berkas ini`,
      );
    }
  }

  const reason = input.reason.trim();
  if (!reason) {
    throw new BerkasValidationError("Alasan penolakan wajib diisi");
  }

  try {
    await getPgDb().transaction(async (tx) => {
      const current = await findBerkasForUpdate(id, tx);
      if (!current) throw new BerkasNotFoundError();
      if (current.version !== detail.version) {
        throw new BerkasConflictError(
          "Versi Berkas sudah berubah. Muat ulang data terbaru.",
        );
      }
      assertTransition(current.status as BerkasStatus, "DITOLAK");

      const updated = await updateBerkasRejectionRow(
        id,
        current.version,
        {
          rejectionReason: reason,
          rejectedAt: new Date(),
          rejectedBy: actor.id,
        },
        tx,
      );
      if (!updated) {
        throw new BerkasConflictError(
          "Versi Berkas sudah berubah. Muat ulang data terbaru.",
        );
      }
    });
  } catch (error) {
    mapWriteError(error);
  }

  const updated = await findBerkasDetailRowById(id);
  if (!updated) throw new BerkasNotFoundError();
  return toDetail(updated);
}

export async function revisiBerkas(
  actor: BerkasActor,
  id: string,
  input: RevisiBerkasInput,
): Promise<BerkasDetail> {
  assertActive(actor);

  const detail = await findBerkasDetailRowById(id);
  if (!detail) {
    throw new BerkasNotFoundError();
  }
  if (!isAdmin(actor.role) && detail.pemohonId !== actor.id) {
    throw new BerkasForbiddenError("Hanya pemohon yang dapat merevisi Berkas");
  }
  if (detail.status !== "DITOLAK") {
    throw new BerkasConflictError("Hanya Berkas ditolak yang dapat direvisi");
  }
  if (input.newPdfPathname === detail.originalPdfPathname) {
    throw new BerkasValidationError("PDF revisi harus berbeda dari PDF lama");
  }

  const parsed = parseBerkasUploadPathname(input.newPdfPathname);
  if (!parsed || parsed.actorId !== actor.id || parsed.kind !== "original") {
    throw new BerkasValidationError("Path PDF revisi tidak valid");
  }
  const fileName = sanitizeBerkasFileName(input.fileName ?? parsed.fileName);

  try {
    if (!fileName || !fileName.toLowerCase().endsWith(".pdf")) {
      throw new BerkasValidationError("Nama file PDF revisi tidak valid");
    }
    const verified = await verifyPrivateBlob(
      input.newPdfPathname,
      new Set([ORIGINAL_PDF_MIME]),
      ORIGINAL_PDF_MAX_BYTES,
      "PDF revisi",
    );
    const bytes = await readPrivateBlobBytes(input.newPdfPathname, "PDF revisi");
    const pageCount = await readPdfPageCount(bytes, "PDF revisi");
    const oldTtdPathnames = detail.validasi
      .map((item) => item.ttdPathname)
      .filter((pathname): pathname is string => Boolean(pathname));

    await getPgDb().transaction(async (tx) => {
      const current = await findBerkasForUpdate(id, tx);
      if (!current) throw new BerkasNotFoundError();
      if (current.version !== detail.version) {
        throw new BerkasConflictError(
          "Versi Berkas sudah berubah. Muat ulang data terbaru.",
        );
      }
      assertTransition(current.status as BerkasStatus, "MENUNGGU_TTD_1");

      const updated = await updateBerkasRevisionRow(
        id,
        current.version,
        {
          originalPdfPathname: input.newPdfPathname,
          originalPdfName: fileName,
          originalPdfMimeType: verified.mimeType,
          originalPdfSizeBytes: verified.blob.size,
          originalPdfPageCount: pageCount,
        },
        tx,
      );
      if (!updated) {
        throw new BerkasConflictError(
          "Versi Berkas sudah berubah. Muat ulang data terbaru.",
        );
      }
      await clearBerkasValidasiTtdRows(id, tx);
    });

    await cleanupBerkasBlobs(
      [detail.originalPdfPathname, ...oldTtdPathnames],
      { operation: "revisi", berkasId: id },
    );
  } catch (error) {
    if (!isReusedPathnameViolation(error)) {
      await cleanupBerkasBlobs([input.newPdfPathname], {
        operation: "revisi",
        berkasId: id,
      });
    }
    mapWriteError(error);
  }

  const updated = await findBerkasDetailRowById(id);
  if (!updated) throw new BerkasNotFoundError();
  return toDetail(updated);
}

export async function downloadBerkas(
  actor: BerkasActor,
  id: string,
): Promise<BerkasDownload> {
  assertDownloadAccess(actor);

  const row = await findBerkasDownloadRowById(id);
  if (!row) {
    throw new BerkasNotFoundError();
  }
  assertRowVisible(actor, row.pemohonId);

  if (row.status !== "SELESAI" || !row.generatedPdfPathname) {
    throw new BerkasConflictError(
      "Berkas belum selesai diproses dan belum dapat diunduh",
    );
  }

  const nip = actor.nip?.trim() ?? "";
  if (!nip) {
    throw new BerkasValidationError(
      "NIP wajib diisi sebelum mengunduh Berkas",
    );
  }

  const generated = await readPrivateBlobBytes(
    row.generatedPdfPathname,
    "Generated PDF",
  );
  let watermarked: Uint8Array;
  try {
    watermarked = await applyWatermark(generated, nip);
  } catch {
    throw new BerkasPdfError("Gagal menempelkan watermark pada PDF");
  }

  return {
    bytes: watermarked,
    fileName: downloadFileName(row.judul, row.id),
  };
}
