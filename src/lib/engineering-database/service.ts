import {
  canManageEngineeringDatabase,
  canViewEngineeringDatabase,
  canViewEngineeringDatabaseSummary,
  isEngineeringDatabaseCategory,
  isEngineeringDatabasePicRole,
  type EngineeringDatabaseCategory,
} from "@/lib/engineering-database/access";
import {
  deleteEngineeringDatabaseEntryRow,
  findEngineeringDatabaseEntryRowById,
  findMasterProjectRef,
  insertEngineeringDatabaseEntry,
  listEngineeringDatabaseEntryRows,
  listEngineeringDatabasePicOptions as listPicOptionRows,
  listEngineeringDatabaseSummaryPairs,
  listMasterProjectSummaryRows,
  searchMasterProjectOptions as searchProjectOptionRows,
  updateEngineeringDatabaseEntryRow,
  type EngineeringDatabaseEntryRow,
  type EngineeringDatabaseMutableData,
  type EngineeringDatabasePicOptionRow,
  type MasterProjectOptionRow,
} from "@/lib/engineering-database/repository";
import type {
  CreateEngineeringDatabaseEntryInput,
  UpdateEngineeringDatabaseEntryInput,
} from "@/lib/engineering-database/schema";
import {
  buildEngineeringDatabaseSummary,
  type EngineeringDatabaseSummary,
} from "@/lib/engineering-database/summary";
import { findUserById } from "@/lib/users/repository";

export type EngineeringDatabaseActor = {
  id: string;
  role: string;
  status: string;
};

export type EngineeringDatabaseItem = {
  id: string;
  project: { id: string; name: string; location: string };
  category: EngineeringDatabaseCategory;
  fileUrl: string;
  pic: { id: string; name: string };
  // Required in V1: there is no nullable-note state.
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EngineeringDatabasePicOption = EngineeringDatabasePicOptionRow;
export type EngineeringDatabaseProjectOption = MasterProjectOptionRow;

export class EngineeringDatabaseForbiddenError extends Error {
  constructor(message = "Akses Engineering Databases ditolak") {
    super(message);
    this.name = "EngineeringDatabaseForbiddenError";
  }
}

export class EngineeringDatabaseNotFoundError extends Error {
  constructor(message = "Data Engineering Databases tidak ditemukan") {
    super(message);
    this.name = "EngineeringDatabaseNotFoundError";
  }
}

export class EngineeringDatabaseConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineeringDatabaseConflictError";
  }
}

export class EngineeringDatabaseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineeringDatabaseValidationError";
  }
}

const PROJECT_OPTION_LIMIT = 50;

// Drizzle wraps driver errors in DrizzleQueryError, so the SQLSTATE must be
// read from the nested `cause` chain. 23503 = foreign_key_violation (NO
// ACTION); 23001 = restrict_violation. Both mean "referenced row vanished
// concurrently" (project deleted or PIC removed between validation and write).
const ROW_REFERENCED_CODES = new Set(["23503", "23001"]);

function isForeignKeyViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && ROW_REFERENCED_CODES.has(code)) {
    return true;
  }
  const cause = (error as { cause?: unknown }).cause;
  return cause === error ? false : isForeignKeyViolation(cause, depth + 1);
}

function assertActive(actor: EngineeringDatabaseActor): void {
  if (actor.status !== "active") {
    throw new EngineeringDatabaseForbiddenError();
  }
}

function assertViewAccess(actor: EngineeringDatabaseActor): void {
  assertActive(actor);
  if (!canViewEngineeringDatabase(actor.role)) {
    throw new EngineeringDatabaseForbiddenError();
  }
}

function assertManageAccess(actor: EngineeringDatabaseActor): void {
  assertActive(actor);
  if (!canManageEngineeringDatabase(actor.role)) {
    throw new EngineeringDatabaseForbiddenError();
  }
}

function assertSummaryAccess(actor: EngineeringDatabaseActor): void {
  assertActive(actor);
  if (!canViewEngineeringDatabaseSummary(actor.role)) {
    throw new EngineeringDatabaseForbiddenError();
  }
}

function toCategory(value: string): EngineeringDatabaseCategory {
  if (!isEngineeringDatabaseCategory(value)) {
    // Unreachable while the DB CHECK constraint is in place.
    throw new Error(`Unknown Engineering Database category: ${value}`);
  }
  return value;
}

function toItem(row: EngineeringDatabaseEntryRow): EngineeringDatabaseItem {
  return {
    id: row.id,
    project: {
      id: row.projectId,
      name: row.projectName,
      location: row.projectLocation,
    },
    category: toCategory(row.category),
    fileUrl: row.fileUrl,
    pic: { id: row.picUserId, name: row.picName },
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getEntryOrThrow(id: string): Promise<EngineeringDatabaseEntryRow> {
  const row = await findEngineeringDatabaseEntryRowById(id);
  if (!row) {
    throw new EngineeringDatabaseNotFoundError();
  }
  return row;
}

// The project must resolve to a live Master Project; the FK is the backstop.
async function validateProject(projectId: string): Promise<void> {
  const project = await findMasterProjectRef(projectId);
  if (!project) {
    throw new EngineeringDatabaseNotFoundError("Master Project tidak ditemukan");
  }
}

// PIC must be an existing user whose role is eligible (Admin, Head Office,
// Project). Management is never eligible. Role-based only in V1.
async function validatePic(picUserId: string): Promise<void> {
  const user = await findUserById(picUserId);
  if (!user) {
    throw new EngineeringDatabaseNotFoundError("PIC tidak ditemukan");
  }
  if (!isEngineeringDatabasePicRole(user.role)) {
    throw new EngineeringDatabaseConflictError(
      "PIC harus user dengan role Admin, Head Office, atau Project",
    );
  }
}

export async function listEngineeringDatabaseEntries(
  actor: EngineeringDatabaseActor,
  category: EngineeringDatabaseCategory,
  q?: string,
): Promise<EngineeringDatabaseItem[]> {
  assertViewAccess(actor);
  const rows = await listEngineeringDatabaseEntryRows(category, q);
  return rows.map(toItem);
}

export async function getEngineeringDatabaseEntry(
  actor: EngineeringDatabaseActor,
  id: string,
): Promise<EngineeringDatabaseItem> {
  assertViewAccess(actor);
  return toItem(await getEntryOrThrow(id));
}

export async function createEngineeringDatabaseEntry(
  actor: EngineeringDatabaseActor,
  input: CreateEngineeringDatabaseEntryInput,
): Promise<EngineeringDatabaseItem> {
  assertManageAccess(actor);
  await validateProject(input.projectId);
  await validatePic(input.picUserId);

  try {
    const id = await insertEngineeringDatabaseEntry({
      projectId: input.projectId,
      category: input.category,
      fileUrl: input.fileUrl,
      picUserId: input.picUserId,
      note: input.note,
      createdBy: actor.id,
    });
    return toItem(await getEntryOrThrow(id));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new EngineeringDatabaseConflictError(
        "Master Project atau PIC tidak lagi tersedia",
      );
    }
    throw error;
  }
}

export async function updateEngineeringDatabaseEntry(
  actor: EngineeringDatabaseActor,
  id: string,
  input: UpdateEngineeringDatabaseEntryInput,
): Promise<EngineeringDatabaseItem> {
  assertManageAccess(actor);
  await getEntryOrThrow(id);

  // project IS editable: it may be re-pointed at another Master Project while
  // keeping the same entry id. category is immutable and absent from the
  // update contract.
  if (input.projectId !== undefined) {
    await validateProject(input.projectId);
  }
  if (input.picUserId !== undefined) {
    await validatePic(input.picUserId);
  }

  const patch: EngineeringDatabaseMutableData = {};
  if (input.projectId !== undefined) patch.projectId = input.projectId;
  if (input.fileUrl !== undefined) patch.fileUrl = input.fileUrl;
  if (input.picUserId !== undefined) patch.picUserId = input.picUserId;
  if (input.note !== undefined) patch.note = input.note;

  try {
    const updated = await updateEngineeringDatabaseEntryRow(id, patch);
    if (!updated) {
      throw new EngineeringDatabaseNotFoundError();
    }
    return toItem(await getEntryOrThrow(id));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new EngineeringDatabaseConflictError(
        "Master Project atau PIC tidak lagi tersedia",
      );
    }
    throw error;
  }
}

export async function deleteEngineeringDatabaseEntry(
  actor: EngineeringDatabaseActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);
  const deleted = await deleteEngineeringDatabaseEntryRow(id);
  if (!deleted) {
    throw new EngineeringDatabaseNotFoundError();
  }
  return { deleted: true, id };
}

export async function listEngineeringDatabasePicOptions(
  actor: EngineeringDatabaseActor,
): Promise<EngineeringDatabasePicOption[]> {
  // Mirrors the existing PIC-option endpoints: options are only served to
  // actors who may manage records.
  assertManageAccess(actor);
  return listPicOptionRows();
}

export async function listEngineeringDatabaseProjectOptions(
  actor: EngineeringDatabaseActor,
  q?: string,
): Promise<EngineeringDatabaseProjectOption[]> {
  assertViewAccess(actor);
  return searchProjectOptionRows(q, PROJECT_OPTION_LIMIT);
}

export async function getEngineeringDatabaseSummary(
  actor: EngineeringDatabaseActor,
): Promise<EngineeringDatabaseSummary> {
  assertSummaryAccess(actor);
  const [projects, pairs] = await Promise.all([
    listMasterProjectSummaryRows(),
    listEngineeringDatabaseSummaryPairs(),
  ]);
  return buildEngineeringDatabaseSummary(projects, pairs);
}
