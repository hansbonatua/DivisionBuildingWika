import { getPgDb } from "@/lib/pg/client";
import { HEAD_OFFICE_ROLE } from "@/lib/users/roles";
import {
  canManageKnowledgeManagement,
  canViewKnowledgeManagement,
} from "@/lib/knowledge-management/access";
import {
  deleteKnowledgeEvidence,
  findEvidenceById,
  findKnowledgeEntry,
  findMasterProjectById,
  findUsersByIds,
  insertKnowledgeEntry,
  insertKnowledgeEvidence,
  listHeadOfficePicOptions as listHeadOfficePicOptionRows,
  listKnowledgeRows,
  nextEvidenceSortOrder,
  replaceKnowledgePics,
  updateKnowledgeContentIfUnchanged,
  updateKnowledgeEvidence,
  type KnowledgeProjectRow,
} from "@/lib/knowledge-management/repository";
import { hasStaleTimestamp } from "@/lib/knowledge-management/conflict";
import type {
  EvidenceItemInput,
  KnowledgeType,
  UpsertKnowledgeEntryInput,
} from "@/lib/knowledge-management/schema";

// Server-only business rules for Knowledge Management V1. Routes never bypass
// this layer: HTTP mapping is Forbidden → 403, NotFound → 404,
// Conflict → 409, Validation → 400.

export type KnowledgeActor = {
  id: string;
  role: string;
  status: string;
};

export type KnowledgePicOption = {
  id: string;
  name: string;
  status: string;
  position: string;
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

// Mutations require KNOWLEDGE_MANAGEMENT_MANAGE: Admin (super application) and
// Head Office. Management and Project are strictly read-only.
function assertManageAccess(actor: KnowledgeActor): void {
  assertActive(actor);
  if (!canManageKnowledgeManagement(actor.role)) {
    throw new KnowledgeForbiddenError();
  }
}

// Deduplicates and validates the PIC list. Every assignee must exist and be a
// Head Office user. Account status is deliberately NOT checked: suspended Head
// Office users stay eligible for PIC assignment in V1.
async function validatePicIds(picIds: string[]): Promise<string[]> {
  const unique = [...new Set(picIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (unique.length === 0) {
    // Business rule: every knowledge record has at least one PIC.
    throw new KnowledgeValidationError("Minimal 1 PIC");
  }
  const found = await findUsersByIds(unique);
  if (found.length !== unique.length) {
    throw new KnowledgeNotFoundError("PIC user tidak ditemukan");
  }
  for (const user of found) {
    if (user.role !== HEAD_OFFICE_ROLE) {
      throw new KnowledgeConflictError("PIC harus user dengan role Head Office");
    }
  }
  return unique;
}

const UNIQUE_VIOLATION = "23505";
const STALE_UPDATE_MESSAGE =
  "Data sudah diubah oleh pengguna lain. Muat ulang data lalu coba lagi.";

function isUniqueViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (code === UNIQUE_VIOLATION) {
    return true;
  }
  return isUniqueViolation((error as { cause?: unknown }).cause, depth + 1);
}

// A referenced row cannot be written: PostgreSQL signals 23503
// (foreign_key_violation, NO ACTION) or 23001 (restrict_violation). In this
// module it can only happen when a PIC user disappears between validation and
// insert, so it is a conflict (409), never a raw 500.
const ROW_REFERENCED_CODES = new Set(["23503", "23001"]);

function isCheckViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (code === "23514") {
    return true;
  }
  return isCheckViolation((error as { cause?: unknown }).cause, depth + 1);
}

function isForeignKeyViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && ROW_REFERENCED_CODES.has(code)) {
    return true;
  }
  return isForeignKeyViolation((error as { cause?: unknown }).cause, depth + 1);
}

// Read surface: every Master Project in the directory, with or without a
// knowledge record. Available to all four roles (Admin, Head Office,
// Management, Project).
export async function listKnowledgeProjectRows(
  actor: KnowledgeActor,
  knowledgeType: KnowledgeType,
): Promise<KnowledgeProjectRow[]> {
  assertViewAccess(actor);
  return listKnowledgeRows(knowledgeType);
}

// Creates or replaces the inline record for (project, knowledgeType): content
// and PIC only. Evidence is deliberately untouched here — it is managed by the
// dedicated evidence endpoints, one row at a time.
export async function upsertKnowledgeEntry(
  actor: KnowledgeActor,
  input: UpsertKnowledgeEntryInput,
): Promise<{ entryId: string }> {
  assertManageAccess(actor);

  const project = await findMasterProjectById(input.projectId);
  if (!project) {
    throw new KnowledgeNotFoundError("Master Project tidak ditemukan");
  }

  const picIds = await validatePicIds(input.picIds);
  const expectedUpdatedAt = input.expectedUpdatedAt ?? null;
  const db = getPgDb();

  try {
    const entryId = await db.transaction(async (tx) => {
      const existing = await findKnowledgeEntry(input.projectId, input.knowledgeType, tx);
      let id: string;
      if (existing) {
        if (hasStaleTimestamp(existing.updatedAt, expectedUpdatedAt)) {
          throw new KnowledgeConflictError(STALE_UPDATE_MESSAGE);
        }
        const updated = await updateKnowledgeContentIfUnchanged(
          existing.id,
          input.content,
          actor.id,
          existing.updatedAt,
          tx,
        );
        if (!updated) {
          // Someone committed between the read and the guarded UPDATE.
          throw new KnowledgeConflictError(STALE_UPDATE_MESSAGE);
        }
        id = existing.id;
      } else {
        if (expectedUpdatedAt !== null) {
          // The client thought a record existed, but it no longer does.
          throw new KnowledgeConflictError(STALE_UPDATE_MESSAGE);
        }
        id = await insertKnowledgeEntry(
          {
            projectId: input.projectId,
            knowledgeType: input.knowledgeType,
            content: input.content,
            createdBy: actor.id,
          },
          tx,
        );
      }
      await replaceKnowledgePics(id, picIds, tx);
      return id;
    });
    return { entryId };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new KnowledgeConflictError(
        "Proyek ini sudah memiliki data untuk submenu tersebut",
      );
    }
    if (isForeignKeyViolation(error)) {
      throw new KnowledgeConflictError(
        "PIC atau proyek terkait sudah tidak tersedia. Muat ulang data lalu coba lagi.",
      );
    }
    if (isCheckViolation(error)) {
      // Raised by the database trigger when a record would end up without PIC.
      throw new KnowledgeValidationError("Minimal 1 PIC");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Evidence (individual rows, independent of content/PIC)
// ---------------------------------------------------------------------------

async function getEntryOrThrow(
  projectId: string,
  knowledgeType: KnowledgeType,
): Promise<{ id: string }> {
  const entry = await findKnowledgeEntry(projectId, knowledgeType);
  if (!entry) {
    throw new KnowledgeNotFoundError(
      "Simpan konten dan PIC terlebih dahulu sebelum menambahkan evidence",
    );
  }
  return entry;
}

export async function addKnowledgeEvidence(
  actor: KnowledgeActor,
  projectId: string,
  knowledgeType: KnowledgeType,
  input: EvidenceItemInput,
): Promise<{ id: string; name: string; url: string }> {
  assertManageAccess(actor);
  const entry = await getEntryOrThrow(projectId, knowledgeType);
  const sortOrder = await nextEvidenceSortOrder(entry.id);
  return insertKnowledgeEvidence(entry.id, input, sortOrder);
}

export async function updateKnowledgeEvidenceById(
  actor: KnowledgeActor,
  evidenceId: string,
  input: EvidenceItemInput,
): Promise<{ id: string; name: string; url: string }> {
  assertManageAccess(actor);
  const existing = await findEvidenceById(evidenceId);
  if (!existing) {
    throw new KnowledgeNotFoundError("Evidence tidak ditemukan");
  }
  const updated = await updateKnowledgeEvidence(evidenceId, input);
  if (!updated) {
    throw new KnowledgeNotFoundError("Evidence tidak ditemukan");
  }
  return updated;
}

export async function deleteKnowledgeEvidenceById(
  actor: KnowledgeActor,
  evidenceId: string,
): Promise<{ deleted: true; id: string }> {
  assertManageAccess(actor);
  const existing = await findEvidenceById(evidenceId);
  if (!existing) {
    throw new KnowledgeNotFoundError("Evidence tidak ditemukan");
  }
  const deleted = await deleteKnowledgeEvidence(evidenceId);
  if (!deleted) {
    throw new KnowledgeNotFoundError("Evidence tidak ditemukan");
  }
  return { deleted: true, id: evidenceId };
}

// PIC option feed is management-only: Management/Project can read PIC names in
// the table but must never need the assignment list.
export async function listKnowledgePicOptions(
  actor: KnowledgeActor,
): Promise<KnowledgePicOption[]> {
  assertManageAccess(actor);
  return listHeadOfficePicOptionRows();
}
