import {
  canCreateMasterProject,
  canDeleteMasterProject,
  canEditMasterProject,
  canViewMasterProject,
} from "@/lib/master-project/access";
import {
  deleteMasterProjectRow,
  findDuplicateMasterProject,
  getMasterProjectById,
  insertMasterProject,
  listMasterProjectPicOptions as listPicOptionRows,
  listMasterProjects as listMasterProjectRows,
  updateMasterProjectRow,
  type MasterProjectMutableData,
  type MasterProjectPicOptionRow,
  type MasterProjectRow,
} from "@/lib/master-project/repository";
import type {
  CreateMasterProjectInput,
  UpdateMasterProjectInput,
} from "@/lib/master-project/schema";
import { findUserById } from "@/lib/users/repository";
import { ADMIN_ROLE, HEAD_OFFICE_ROLE } from "@/lib/users/roles";

export type MasterProjectActor = {
  id: string;
  role: string;
  status: string;
};

export type MasterProjectItem = {
  id: string;
  name: string;
  location: string;
  // Canonical single year. Consumers (e.g. MSL Engineering) read it from here
  // and never keep their own copy.
  year: number;
  pic: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type MasterProjectPicOption = MasterProjectPicOptionRow;

export class MasterProjectForbiddenError extends Error {
  constructor(message = "Akses Master Project ditolak") {
    super(message);
    this.name = "MasterProjectForbiddenError";
  }
}

export class MasterProjectNotFoundError extends Error {
  constructor(message = "Master Project tidak ditemukan") {
    super(message);
    this.name = "MasterProjectNotFoundError";
  }
}

export class MasterProjectConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MasterProjectConflictError";
  }
}

const UNIQUE_INDEX_NAME = "master_projects_name_location_ci_unique";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as {
    code?: unknown;
    constraint_name?: unknown;
    detail?: unknown;
    message?: unknown;
  };
  if (candidate.code !== "23505") {
    return false;
  }
  const constraintName =
    typeof candidate.constraint_name === "string"
      ? candidate.constraint_name
      : "";
  const detail = typeof candidate.detail === "string" ? candidate.detail : "";
  const message = typeof candidate.message === "string" ? candidate.message : "";
  return (
    constraintName === UNIQUE_INDEX_NAME ||
    detail.includes(UNIQUE_INDEX_NAME) ||
    message.includes(UNIQUE_INDEX_NAME) ||
    constraintName === ""
  );
}

// A referenced row cannot be deleted. PostgreSQL signals this with 23503
// (foreign_key_violation, NO ACTION) or 23001 (restrict_violation, ON DELETE
// RESTRICT) — engineering_database_entries.project_id uses RESTRICT, which is
// why both are accepted. Drizzle wraps driver errors in DrizzleQueryError, so
// the SQLSTATE is read from the nested `cause` chain.
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

function assertActive(actor: MasterProjectActor): void {
  if (actor.status !== "active") {
    throw new MasterProjectForbiddenError();
  }
}

function assertViewAccess(actor: MasterProjectActor): void {
  assertActive(actor);
  if (!canViewMasterProject(actor.role)) {
    throw new MasterProjectForbiddenError();
  }
}

function assertCreateAccess(actor: MasterProjectActor): void {
  assertActive(actor);
  if (!canCreateMasterProject(actor.role)) {
    throw new MasterProjectForbiddenError();
  }
}

function assertEditAccess(actor: MasterProjectActor): void {
  assertActive(actor);
  if (!canEditMasterProject(actor.role)) {
    throw new MasterProjectForbiddenError();
  }
}

function assertDeleteAccess(actor: MasterProjectActor): void {
  assertActive(actor);
  if (!canDeleteMasterProject(actor.role)) {
    throw new MasterProjectForbiddenError();
  }
}

function toItem(row: MasterProjectRow): MasterProjectItem {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    year: row.year,
    pic: { id: row.picUserId, name: row.picName },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getMasterProjectOrThrow(
  id: string,
): Promise<MasterProjectRow> {
  const row = await getMasterProjectById(id);
  if (!row) {
    throw new MasterProjectNotFoundError();
  }
  return row;
}

async function validatePic(picUserId: string): Promise<void> {
  const user = await findUserById(picUserId);
  if (!user) {
    throw new MasterProjectNotFoundError("PIC tidak ditemukan");
  }
  if (user.role !== ADMIN_ROLE && user.role !== HEAD_OFFICE_ROLE) {
    throw new MasterProjectConflictError(
      "PIC harus user dengan role Admin atau Head Office",
    );
  }
}

async function assertUnique(
  name: string,
  location: string,
  excludeId?: string,
): Promise<void> {
  const duplicate = await findDuplicateMasterProject(name, location, excludeId);
  if (duplicate) {
    throw new MasterProjectConflictError(
      "Master Project dengan nama dan lokasi tersebut sudah terdaftar",
    );
  }
}

export async function listMasterProjects(
  actor: MasterProjectActor,
  q?: string,
): Promise<MasterProjectItem[]> {
  assertViewAccess(actor);
  const rows = await listMasterProjectRows({ q });
  return rows.map(toItem);
}

export async function getMasterProject(
  actor: MasterProjectActor,
  id: string,
): Promise<MasterProjectItem> {
  assertViewAccess(actor);
  const row = await getMasterProjectOrThrow(id);
  return toItem(row);
}

export async function createMasterProject(
  actor: MasterProjectActor,
  input: CreateMasterProjectInput,
): Promise<MasterProjectItem> {
  assertCreateAccess(actor);
  await validatePic(input.picUserId);
  await assertUnique(input.name, input.location);

  try {
    const id = await insertMasterProject({
      name: input.name,
      location: input.location,
      year: input.year,
      picUserId: input.picUserId,
      createdBy: actor.id,
    });
    return toItem(await getMasterProjectOrThrow(id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MasterProjectConflictError(
        "Master Project dengan nama dan lokasi tersebut sudah terdaftar",
      );
    }
    throw error;
  }
}

export async function updateMasterProject(
  actor: MasterProjectActor,
  id: string,
  input: UpdateMasterProjectInput,
): Promise<MasterProjectItem> {
  assertEditAccess(actor);
  const existing = await getMasterProjectOrThrow(id);

  if (input.picUserId !== undefined) {
    await validatePic(input.picUserId);
  }
  if (input.name !== undefined || input.location !== undefined) {
    await assertUnique(
      input.name ?? existing.name,
      input.location ?? existing.location,
      id,
    );
  }

  const patch: MasterProjectMutableData = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.location !== undefined) patch.location = input.location;
  if (input.year !== undefined) patch.year = input.year;
  if (input.picUserId !== undefined) patch.picUserId = input.picUserId;

  try {
    const updated = await updateMasterProjectRow(id, patch);
    if (!updated) {
      throw new MasterProjectNotFoundError();
    }
    return toItem(await getMasterProjectOrThrow(id));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new MasterProjectConflictError(
        "Master Project dengan nama dan lokasi tersebut sudah terdaftar",
      );
    }
    throw error;
  }
}

export async function deleteMasterProject(
  actor: MasterProjectActor,
  id: string,
): Promise<{ deleted: true; id: string }> {
  assertDeleteAccess(actor);

  // Hard delete semantics are unchanged: the row is removed, never
  // soft-deleted. Only the refusal case is mapped (23503 → 409).
  let deleted: boolean;
  try {
    deleted = await deleteMasterProjectRow(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new MasterProjectConflictError(
        "Master Project tidak dapat dihapus karena masih digunakan oleh data Engineering Database atau MSL Engineering",
      );
    }
    throw error;
  }

  if (!deleted) {
    throw new MasterProjectNotFoundError();
  }
  return { deleted: true, id };
}

export async function listMasterProjectPicOptions(
  actor: MasterProjectActor,
): Promise<MasterProjectPicOption[]> {
  assertEditAccess(actor);
  return listPicOptionRows();
}
