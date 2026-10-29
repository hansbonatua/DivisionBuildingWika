import {
  canManageOrganizationStructure,
  canViewOrganizationStructure,
  OrganizationStructureForbiddenError,
} from "@/lib/organization-structure/access";
import {
  CmsImageValidationError,
  deleteCmsImageIfUnreferenced,
  deleteReplacedCmsImage,
  verifyCmsUploadedImage,
} from "@/lib/cms/image-storage";
import { isCmsOrganizationBlobPathname } from "@/lib/cms/storage-path";
import {
  deleteRow,
  findRow,
  insertRow,
  updateRowImage,
  type OrganizationStructureRowWithActor,
} from "@/lib/organization-structure/repository";
import type { ReplaceOrganizationStructureInput } from "@/lib/organization-structure/schema";
import { isUniqueViolation } from "@/lib/pg/errors";

// Struktur Organisasi service (V1 backend).
//
// Responsibilities: authorization, blob re-verification, the singleton
// read/write rules and the strict "database first, storage second" ordering.
// Route handlers only parse HTTP and map errors; the repository only touches
// rows.
//
// Exactly one chart exists. "Not configured" is the absence of a row, never a
// null column or a placeholder URL, so the reader has one state to handle.

export type OrganizationStructureActor = {
  id: string;
  role: string;
};

// Public (authenticated) shape. Deliberately omits `blobPathname`, the actor
// ids and every other database/internal detail: viewers only need something to
// render plus who/when.
export type OrganizationStructureDto = {
  imageUrl: string;
  fileName: string | null;
  updatedAt: string;
  updatedByName: string | null;
};

export class OrganizationStructureNotFoundError extends Error {
  constructor(message = "Struktur organisasi belum tersedia") {
    super(message);
    this.name = "OrganizationStructureNotFoundError";
  }
}

function assertCanView(actor: OrganizationStructureActor): void {
  if (!canViewOrganizationStructure(actor.role)) {
    throw new OrganizationStructureForbiddenError("Akses Struktur Organisasi ditolak");
  }
}

function assertCanManage(actor: OrganizationStructureActor): void {
  if (!canManageOrganizationStructure(actor.role)) {
    throw new OrganizationStructureForbiddenError();
  }
}

function toDto(row: OrganizationStructureRowWithActor): OrganizationStructureDto {
  return {
    imageUrl: row.imageUrl,
    fileName: row.fileName,
    updatedAt: row.updatedAt.toISOString(),
    updatedByName: row.updatedByName,
  };
}

/** The single active chart, or null when nothing has been uploaded yet. */
export async function getOrganizationStructure(
  actor: OrganizationStructureActor,
): Promise<OrganizationStructureDto | null> {
  assertCanView(actor);
  const row = await findRow();
  return row ? toDto(row) : null;
}

/**
 * Replaces (or first-time creates) the single chart.
 *
 * Order is fixed and must not be rearranged:
 *   1. validate the claimed upload (namespace, size, content type, real URL);
 *   2. capture the previous row, so its object can be reclaimed afterwards;
 *   3. write the database;
 *   4. only then delete the previous object, best effort.
 *
 * A storage failure after step 3 therefore leaves at most an orphan object — it
 * can never lose the image that is now live, and it never turns a successful
 * save into an error.
 */
export async function replaceOrganizationStructure(
  actor: OrganizationStructureActor,
  input: ReplaceOrganizationStructureInput,
): Promise<OrganizationStructureDto> {
  assertCanManage(actor);

  // Namespace gate BEFORE the generic CMS verification: verifyCmsUploadedImage
  // accepts any `cms/*` namespace, and this module may only ever own an object
  // in `cms/organization/`.
  if (!isCmsOrganizationBlobPathname(input.blobPathname)) {
    throw new CmsImageValidationError(
      "Lokasi file gambar tidak valid. Unggah ulang gambar.",
    );
  }

  const verified = await verifyCmsUploadedImage({
    imageUrl: input.imageUrl,
    blobPathname: input.blobPathname,
  });

  // Display name is server-derived: the client never sends one, so it cannot
  // disagree with the object that was actually stored.
  const fileName = verified.blobPathname.split("/").pop() ?? null;

  const previous = await findRow();

  if (previous) {
    await updateRowImage({
      imageUrl: verified.imageUrl,
      blobPathname: verified.blobPathname,
      fileName,
      actorId: actor.id,
    });
  } else {
    try {
      await insertRow({
        imageUrl: verified.imageUrl,
        blobPathname: verified.blobPathname,
        fileName,
        actorId: actor.id,
      });
    } catch (error) {
      // Concurrent first upload: the other request created the row, so this one
      // becomes a replace instead of surfacing a unique violation. The UNIQUE
      // constraint on `singleton` is what makes this detection possible.
      if (!isUniqueViolation(error)) {
        throw error;
      }
      await updateRowImage({
        imageUrl: verified.imageUrl,
        blobPathname: verified.blobPathname,
        fileName,
        actorId: actor.id,
      });
    }
  }

  // Storage cleanup strictly AFTER the database write succeeded, and only when
  // the object actually changed. Re-submitting the same object is a no-op.
  if (previous && previous.blobPathname !== verified.blobPathname) {
    await deleteReplacedCmsImage(
      {
        imageUrl: previous.imageUrl,
        imageSource: "upload",
        blobPathname: previous.blobPathname,
      },
      { imageUrl: verified.imageUrl, imageSource: "upload" },
    );
  }

  const saved = await findRow();
  if (!saved) {
    throw new OrganizationStructureNotFoundError();
  }
  return toDto(saved);
}

/**
 * Removes the chart.
 *
 * The row is deleted first so the page can never point at a missing object: if
 * the following blob deletion fails, the only consequence is an unreferenced
 * object, never a broken viewer. The pathname is captured before the delete
 * because the row (and therefore the stored identity) disappears with it.
 */
export async function deleteOrganizationStructure(
  actor: OrganizationStructureActor,
): Promise<{ deleted: true }> {
  assertCanManage(actor);

  const previous = await findRow();
  if (!previous) {
    throw new OrganizationStructureNotFoundError();
  }

  const removed = await deleteRow();
  if (!removed) {
    throw new OrganizationStructureNotFoundError();
  }

  if (isCmsOrganizationBlobPathname(previous.blobPathname)) {
    await deleteCmsImageIfUnreferenced(previous.blobPathname);
  }

  return { deleted: true };
}
