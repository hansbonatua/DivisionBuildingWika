import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import {
  findTemplateById,
  findUserById,
  insertTemplate,
  listPicOptionRows,
  listTemplateRows,
  updateTemplate,
  deleteTemplate,
  type CalculationSheetTemplateRow,
} from "@/lib/calculation-sheet-template/repository";
import type {
  CreateCalculationSheetTemplateInput,
  UpdateCalculationSheetTemplateInput,
} from "@/lib/calculation-sheet-template/schema";
import { isSafeCstUrl } from "@/lib/calculation-sheet-template/schema";
import type { CstCategoryId } from "@/lib/calculation-sheet-template/constants";
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/pg/errors";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";

// Business logic for Calculation Sheet Template (CST).
//
// Actor role/status always come from the server session. Permissions are
// feature-level (CALCULATION_SHEET_VIEW / CALCULATION_SHEET_MANAGE); Head Office
// has full CRUD including delete, Management/Project are read-only, Admin is
// granted both by the central super-application rule.

export type CalculationSheetActor = {
  id: string;
  role: string;
  status: string;
};

export type CalculationSheetPicDto = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export type CalculationSheetUserRef = {
  user_id: string;
  name: string;
};

export type CalculationSheetTemplateDto = {
  id: string;
  kategori: CstCategoryId;
  kode: string;
  nama: string;
  pic: CalculationSheetPicDto;
  evidence_url: string | null;
  catatan: string | null;
  created_by: CalculationSheetUserRef;
  created_at: string;
  updated_by: CalculationSheetUserRef | null;
  updated_at: string;
};

export type CalculationSheetPicOption = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export class CalculationSheetForbiddenError extends Error {
  constructor(message = "Akses Calculation Sheet Template ditolak") {
    super(message);
    this.name = "CalculationSheetForbiddenError";
  }
}

export class CalculationSheetNotFoundError extends Error {
  constructor(message = "Baris Calculation Sheet Template tidak ditemukan") {
    super(message);
    this.name = "CalculationSheetNotFoundError";
  }
}

export class CalculationSheetConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationSheetConflictError";
  }
}

export class CalculationSheetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationSheetValidationError";
  }
}

export function canViewCalculationSheet(role: string): boolean {
  return hasPermission(role, PERMISSIONS.CALCULATION_SHEET_VIEW);
}

export function canManageCalculationSheet(role: string): boolean {
  return hasPermission(role, PERMISSIONS.CALCULATION_SHEET_MANAGE);
}

// PIC eligibility is role-only: suspended Head Office users stay assignable and
// are rendered with the UI's "(non-aktif)" label.
export function isEligibleCalculationSheetPic(user: {
  role: string;
  status: string;
}): boolean {
  return user.role === HEAD_OFFICE_ROLE;
}

function assertActive(actor: CalculationSheetActor): void {
  if (actor.status !== "active") {
    throw new CalculationSheetForbiddenError();
  }
}

export function assertViewAccess(actor: CalculationSheetActor): void {
  assertActive(actor);
  if (!canViewCalculationSheet(actor.role)) {
    throw new CalculationSheetForbiddenError();
  }
}

export function assertManageAccess(actor: CalculationSheetActor): void {
  assertActive(actor);
  if (!canManageCalculationSheet(actor.role)) {
    throw new CalculationSheetForbiddenError();
  }
}

export function normalizeKode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0 || normalized.length > 30) {
    throw new CalculationSheetValidationError("Kode harus 1–30 karakter");
  }
  return normalized;
}

export function normalizeNama(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    throw new CalculationSheetValidationError("Nama harus 1–200 karakter");
  }
  return normalized;
}

export function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
  label: string,
): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length > maxLength) {
    throw new CalculationSheetValidationError(
      `${label} maksimal ${maxLength.toLocaleString("id-ID")} karakter`,
    );
  }
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEvidenceUrl(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.length > 2048 || !isSafeCstUrl(normalized)) {
    throw new CalculationSheetValidationError(
      "URL evidence harus diawali http:// atau https://",
    );
  }
  return normalized;
}

function toTemplateDto(row: CalculationSheetTemplateRow): CalculationSheetTemplateDto {
  return {
    id: row.id,
    kategori: row.kategori as CstCategoryId,
    kode: row.kode,
    nama: row.nama,
    pic: {
      user_id: row.picUserId,
      name: row.picName,
      status: row.picStatus,
      position: row.picPosition,
    },
    evidence_url: row.evidenceUrl,
    catatan: row.catatan,
    created_by: { user_id: row.createdById, name: row.createdByName },
    created_at: row.createdAt.toISOString(),
    updated_by: row.updatedById
      ? { user_id: row.updatedById, name: row.updatedByName ?? "—" }
      : null,
    updated_at: row.updatedAt.toISOString(),
  };
}

function hasSqlState(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const state = (error as { code?: unknown }).code;
  if (state === code) {
    return true;
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : hasSqlState(cause, code, depth + 1);
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof CalculationSheetForbiddenError ||
    error instanceof CalculationSheetNotFoundError ||
    error instanceof CalculationSheetConflictError ||
    error instanceof CalculationSheetValidationError
  ) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new CalculationSheetConflictError(
      "Kode sudah dipakai pada kategori ini. Muat ulang data terbaru.",
    );
  }
  if (isForeignKeyViolation(error)) {
    throw new CalculationSheetConflictError(
      "PIC sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (hasSqlState(error, "23514")) {
    throw new CalculationSheetValidationError(
      "Data Calculation Sheet Template tidak memenuhi aturan database.",
    );
  }
  throw error;
}

async function validatePicUser(picUserId: string): Promise<void> {
  const user = await findUserById(picUserId);
  if (!user) {
    throw new CalculationSheetValidationError("PIC tidak ditemukan");
  }
  if (!isEligibleCalculationSheetPic(user)) {
    throw new CalculationSheetValidationError(
      "PIC harus user dengan role Head Office",
    );
  }
}

export async function listTemplates(
  actor: CalculationSheetActor,
  kategori?: CstCategoryId,
): Promise<CalculationSheetTemplateDto[]> {
  assertViewAccess(actor);
  const rows = await listTemplateRows(undefined, kategori);
  return rows.map(toTemplateDto);
}

export async function listPicOptions(
  actor: CalculationSheetActor,
): Promise<CalculationSheetPicOption[]> {
  // Options are only needed by the inline editor, so they follow MANAGE rather
  // than VIEW (same rule as MKS).
  assertManageAccess(actor);
  const rows = await listPicOptionRows();
  return rows.map((row) => ({
    user_id: row.id,
    name: row.name,
    status: row.status,
    position: row.position,
  }));
}

export async function createTemplate(
  actor: CalculationSheetActor,
  input: CreateCalculationSheetTemplateInput,
): Promise<CalculationSheetTemplateDto> {
  assertManageAccess(actor);
  await validatePicUser(input.pic_user_id);

  let row: CalculationSheetTemplateRow;
  try {
    row = await insertTemplate({
      kategori: input.kategori,
      kode: normalizeKode(input.kode),
      nama: normalizeNama(input.nama),
      picUserId: input.pic_user_id,
      evidenceUrl: normalizeEvidenceUrl(input.evidence_url),
      catatan: normalizeOptionalText(input.catatan, 2000, "Catatan"),
      createdBy: actor.id,
    });
  } catch (error) {
    mapWriteError(error);
  }
  return toTemplateDto(row);
}

export async function updateTemplateById(
  actor: CalculationSheetActor,
  id: string,
  input: UpdateCalculationSheetTemplateInput,
): Promise<CalculationSheetTemplateDto> {
  assertManageAccess(actor);
  const current = await findTemplateById(id);
  if (!current) {
    throw new CalculationSheetNotFoundError();
  }
  await validatePicUser(input.pic_user_id);

  let row: CalculationSheetTemplateRow | null;
  try {
    row = await updateTemplate(id, {
      kode: normalizeKode(input.kode),
      nama: normalizeNama(input.nama),
      picUserId: input.pic_user_id,
      evidenceUrl: normalizeEvidenceUrl(input.evidence_url),
      catatan: normalizeOptionalText(input.catatan, 2000, "Catatan"),
      updatedBy: actor.id,
    });
  } catch (error) {
    mapWriteError(error);
  }
  if (!row) {
    throw new CalculationSheetNotFoundError();
  }
  return toTemplateDto(row);
}

export async function deleteTemplateById(
  actor: CalculationSheetActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);
  let deleted: boolean;
  try {
    deleted = await deleteTemplate(id);
  } catch (error) {
    mapWriteError(error);
  }
  if (!deleted) {
    throw new CalculationSheetNotFoundError();
  }
  return { deleted: true, id };
}
