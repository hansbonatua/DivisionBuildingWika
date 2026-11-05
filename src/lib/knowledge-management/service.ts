import { getPgDb } from "@/lib/pg/client";
import {
  canManageKnowledgeManagement,
  canViewKnowledgeManagement,
  isEligibleKnowledgePic,
} from "@/lib/knowledge-management/access";
import {
  deleteKnowledgeEntry as deleteKnowledgeEntryRow,
  findEvidenceByEntryId,
  findKnowledgeEntryForUpdate,
  findKnowledgeRecordById,
  findMasterProjectById,
  findUsersByIds,
  insertKnowledgeEntry,
  insertKnowledgeEvidence,
  listHeadOfficePicOptions as listHeadOfficePicOptionRows,
  listKnowledgeRecords as listKnowledgeRecordRows,
  listMasterProjectOptions,
  replaceKnowledgePics,
  updateKnowledgeEntry as updateKnowledgeEntryRow,
  updateKnowledgeEvidence,
  type KnowledgeProjectSummary,
  type KnowledgeRecordRow,
} from "@/lib/knowledge-management/repository";
import {
  KnowledgeVersionConflictError,
  hasVersionConflict,
} from "@/lib/knowledge-management/conflict";
import type {
  CreateKnowledgeEntryInput,
  EvidenceItemInput,
  KnowledgeType,
  UpdateKnowledgeEntryInput,
} from "@/lib/knowledge-management/schema";

// Server-only business rules for Knowledge Management V2. Routes never bypass
// this layer: HTTP mapping is Forbidden → 403, NotFound → 404,
// version conflict → 409, Validation → 400.

export { KnowledgeVersionConflictError } from "@/lib/knowledge-management/conflict";

export type KnowledgeActor = {
  id: string;
  role: string;
  status: string;
};

export type KnowledgeRecordDto = {
  id: string;
  project: {
    project_id: string;
    name: string;
    location: string;
    year: number;
  };
  knowledge_type: KnowledgeType;
  content: string;
  pics: Array<{ user_id: string; name: string; status: string }>;
  evidence: { name: string; url: string };
  version: number;
  created_by: { user_id: string; name: string };
  created_at: string;
  updated_by: { user_id: string; name: string } | null;
  updated_at: string;
};

export type KnowledgePicOption = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export type KnowledgeProjectOption = {
  project_id: string;
  name: string;
  location: string;
  year: number;
};

export class KnowledgeForbiddenError extends Error {
  constructor(message = "Akses Knowledge Management ditolak") {
    super(message);
    this.name = "KnowledgeForbiddenError";
  }
}

export class KnowledgeNotFoundError extends Error {
  constructor(message = "Data Knowledge Management tidak ditemukan") {
    super(message);
    this.name = "KnowledgeNotFoundError";
  }
}

export class KnowledgeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeConflictError";
  }
}

export class KnowledgeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeValidationError";
  }
}

function assertActive(actor: KnowledgeActor): void {
  if (actor.status !== "active") {
    throw new KnowledgeForbiddenError();
  }
}

function assertViewAccess(actor: KnowledgeActor): void {
  assertActive(actor);
  if (!canViewKnowledgeManagement(actor.role)) {
    throw new KnowledgeForbiddenError();
  }
}

// Mutations require KNOWLEDGE_MANAGEMENT_MANAGE: Admin and Head Office.
// Management and Project are strictly read-only.
function assertManageAccess(actor: KnowledgeActor): void {
  assertActive(actor);
  if (!canManageKnowledgeManagement(actor.role)) {
    throw new KnowledgeForbiddenError();
  }
}

// Deduplicates PIC IDs and validates every assignee as Head Office. Account
// status is deliberately NOT checked: suspended Head Office users remain
// eligible. There is no maximum number of PICs.
async function validatePicIds(picIds: string[]): Promise<string[]> {
  const unique = [...new Set(picIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (unique.length === 0) {
    throw new KnowledgeValidationError("Minimal 1 PIC");
  }
  const found = await findUsersByIds(unique);
  if (found.length !== unique.length) {
    throw new KnowledgeNotFoundError("PIC user tidak ditemukan");
  }
  for (const user of found) {
    if (!isEligibleKnowledgePic(user)) {
      throw new KnowledgeValidationError("PIC harus user dengan role Head Office");
    }
  }
  return unique;
}

const UNIQUE_VIOLATION = "23505";
const ROW_REFERENCED_CODES = new Set(["23503", "23001"]);

function hasErrorCode(error: unknown, codes: Set<string>, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && codes.has(code)) {
    return true;
  }
  return hasErrorCode((error as { cause?: unknown }).cause, codes, depth + 1);
}

function isUniqueViolation(error: unknown): boolean {
  return hasErrorCode(error, new Set([UNIQUE_VIOLATION]));
}

function isForeignKeyViolation(error: unknown): boolean {
  return hasErrorCode(error, ROW_REFERENCED_CODES);
}

function isCheckViolation(error: unknown): boolean {
  return hasErrorCode(error, new Set(["23514"]));
}

function mapWriteError(error: unknown): never {
  if (
    error instanceof KnowledgeVersionConflictError ||
    error instanceof KnowledgeNotFoundError ||
    error instanceof KnowledgeForbiddenError ||
    error instanceof KnowledgeConflictError ||
    error instanceof KnowledgeValidationError
  ) {
    throw error;
  }
  if (isUniqueViolation(error)) {
    throw new KnowledgeConflictError(
      "Evidence untuk record ini sudah ada. Muat ulang data terbaru.",
    );
  }
  if (isForeignKeyViolation(error)) {
    throw new KnowledgeConflictError(
      "PIC atau proyek terkait sudah tidak tersedia. Muat ulang data terbaru.",
    );
  }
  if (isCheckViolation(error)) {
    throw new KnowledgeValidationError(
      "Data Knowledge Management tidak memenuhi aturan PIC/evidence.",
    );
  }
  throw error;
}

function toRecordDto(row: KnowledgeRecordRow): KnowledgeRecordDto {
  return {
    id: row.id,
    project: {
      project_id: row.project.id,
      name: row.project.name,
      location: row.project.location,
      year: row.project.year,
    },
    knowledge_type: row.knowledgeType,
    content: row.content,
    pics: row.pics.map((pic) => ({
      user_id: pic.id,
      name: pic.name,
      status: pic.status,
    })),
    evidence: {
      name: row.evidence.name,
      url: row.evidence.url,
    },
    version: row.version,
    created_by: {
      user_id: row.createdBy.id,
      name: row.createdBy.name,
    },
    created_at: row.createdAt,
    updated_by: row.updatedBy
      ? { user_id: row.updatedBy.id, name: row.updatedBy.name }
      : null,
    updated_at: row.updatedAt,
  };
}

// Read surface: records only. Projects without records never appear because
// the query starts from knowledge_entries.
export async function listKnowledgeRecords(
  actor: KnowledgeActor,
  knowledgeType: KnowledgeType,
): Promise<KnowledgeRecordDto[]> {
  assertViewAccess(actor);
  const rows = await listKnowledgeRecordRows(knowledgeType);
  return rows.map(toRecordDto);
}

export async function getKnowledgeEntry(
  actor: KnowledgeActor,
  id: string,
): Promise<KnowledgeRecordDto> {
  assertViewAccess(actor);
  const row = await findKnowledgeRecordById(id);
  if (!row) {
    throw new KnowledgeNotFoundError();
  }
  return toRecordDto(row);
}

export async function createKnowledgeEntry(
  actor: KnowledgeActor,
  knowledgeType: KnowledgeType,
  input: CreateKnowledgeEntryInput,
): Promise<KnowledgeRecordDto> {
  assertManageAccess(actor);

  const project = await findMasterProjectById(input.project_id);
  if (!project) {
    throw new KnowledgeNotFoundError("Master Project tidak ditemukan");
  }

  const picIds = await validatePicIds(input.pic_ids);
  const db = getPgDb();

  let entryId: string;
  try {
    entryId = await db.transaction(async (tx) => {
      const id = await insertKnowledgeEntry(
        {
          projectId: input.project_id,
          knowledgeType,
          content: input.content,
          createdBy: actor.id,
        },
        tx,
      );
      await replaceKnowledgePics(id, picIds, tx);
      await insertKnowledgeEvidence(
        id,
        { name: input.evidence_name, url: input.evidence_url },
        tx,
      );
      return id;
    });
  } catch (error) {
    mapWriteError(error);
  }

  return getKnowledgeEntry(actor, entryId);
}

export async function updateKnowledgeEntry(
  actor: KnowledgeActor,
  id: string,
  input: UpdateKnowledgeEntryInput,
): Promise<KnowledgeRecordDto> {
  assertManageAccess(actor);

  const picIds = await validatePicIds(input.pic_ids);
  const db = getPgDb();
  const evidence: EvidenceItemInput = {
    name: input.evidence_name,
    url: input.evidence_url,
  };

  try {
    await db.transaction(async (tx) => {
      const current = await findKnowledgeEntryForUpdate(id, tx);
      if (!current) {
        throw new KnowledgeNotFoundError();
      }
      if (hasVersionConflict(current.version, input.expected_version)) {
        throw new KnowledgeVersionConflictError();
      }

      const updated = await updateKnowledgeEntryRow(
        id,
        input.content,
        actor.id,
        input.expected_version,
        tx,
      );
      if (!updated) {
        // The row lock should make this unreachable, but keep the guard.
        throw new KnowledgeVersionConflictError();
      }

      await replaceKnowledgePics(id, picIds, tx);

      // Evidence is part of the aggregate: UPDATE the existing row in place
      // (preserving its id), or INSERT only when the invariant is missing.
      const existingEvidence = await findEvidenceByEntryId(id, tx);
      if (existingEvidence) {
        const changed = await updateKnowledgeEvidence(
          existingEvidence.id,
          evidence,
          tx,
        );
        if (!changed) {
          await insertKnowledgeEvidence(id, evidence, tx);
        }
      } else {
        await insertKnowledgeEvidence(id, evidence, tx);
      }
    });
  } catch (error) {
    mapWriteError(error);
  }

  return getKnowledgeEntry(actor, id);
}

export async function deleteKnowledgeEntry(
  actor: KnowledgeActor,
  id: string,
  expectedVersion: number,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);
  const db = getPgDb();

  try {
    await db.transaction(async (tx) => {
      const current = await findKnowledgeEntryForUpdate(id, tx);
      if (!current) {
        throw new KnowledgeNotFoundError();
      }
      if (hasVersionConflict(current.version, expectedVersion)) {
        throw new KnowledgeVersionConflictError();
      }
      const deleted = await deleteKnowledgeEntryRow(id, expectedVersion, tx);
      if (!deleted) {
        throw new KnowledgeNotFoundError();
      }
    });
  } catch (error) {
    mapWriteError(error);
  }

  return { deleted: true, id };
}

export async function listKnowledgePicOptions(
  actor: KnowledgeActor,
): Promise<KnowledgePicOption[]> {
  assertManageAccess(actor);
  const rows = await listHeadOfficePicOptionRows();
  return rows.map((row) => ({
    user_id: row.id,
    name: row.name,
    status: row.status,
    position: row.position,
  }));
}

export async function listKnowledgeProjectOptions(
  actor: KnowledgeActor,
  query?: string,
): Promise<KnowledgeProjectOption[]> {
  assertManageAccess(actor);
  const rows = await listMasterProjectOptions(query);
  return rows.map((row: KnowledgeProjectSummary) => ({
    project_id: row.id,
    name: row.name,
    location: row.location,
    year: row.year,
  }));
}
