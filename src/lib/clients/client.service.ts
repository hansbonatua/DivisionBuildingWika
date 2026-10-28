import { ObjectId } from "mongodb";
import * as clientRepository from "@/lib/clients/client.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import {
  deleteCmsImageIfUnreferenced,
  deleteReplacedCmsImage,
  isCmsOwnedImage,
  resolveCmsImageForWrite,
} from "@/lib/cms/image-storage";
import type { CreateClientInput, UpdateClientInput } from "@/lib/clients/client.schema";
import type { ClientDocument, ClientPublic } from "@/lib/clients/client.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicClients` is the public landing read and stays open.
//
// CMS public-logo revision (Phase C): same ownership rules as Hero, Portfolio
// and Green Building, with `logoUrl` as the render field.
// - a record has exactly ONE logo source, upload or external;
// - `logoUrl` remains the only field the landing grid reads;
// - an uploaded logo is re-verified against the PUBLIC CMS store before it is
//   persisted, and its internal pathname is stored alongside it;
// - the previous Blob object is deleted only AFTER a successful database write,
//   and only when this record actually owned it.

// Text fields shared by create and update; the logo is resolved apart because a
// text-only edit must never touch storage.
const TEXT_FIELDS = [
  "name",
  "shortName",
  "category",
  "link",
  "logoAlt",
  "status",
  "sortOrder",
] as const satisfies readonly (keyof UpdateClientInput)[];

// The shared ownership helpers speak `imageUrl`; Clients stores `logoUrl`.
// Mapping in one place keeps the helper signatures uniform across modules.
function logoOwnership(record: {
  logoUrl: string;
  imageSource?: string | null;
  blobPathname?: string | null;
}) {
  return {
    imageUrl: record.logoUrl,
    imageSource: record.imageSource,
    blobPathname: record.blobPathname,
  };
}

export function isValidClientId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listClients(actor: CmsActor): Promise<ClientDocument[]> {
  assertCanManageCms(actor.role);
  return clientRepository.findAll();
}

export async function listPublicClients(): Promise<ClientPublic[]> {
  return clientRepository.findActivePublic();
}

export async function getClient(id: string, actor: CmsActor): Promise<ClientDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidClientId(id)) {
    return null;
  }
  return clientRepository.findById(id);
}

export async function createClient(
  input: CreateClientInput,
  actor: CmsActor,
): Promise<ClientDocument> {
  assertCanManageCms(actor.role);
  const image = await resolveCmsImageForWrite({
    imageUrl: input.logoUrl,
    imageSource: input.imageSource,
    blobPathname: input.blobPathname,
  });
  const maxSortOrder = await clientRepository.getMaxSortOrder();
  const shortName = input.shortName === "" ? input.name : input.shortName;
  const now = new Date();
  return clientRepository.insertOne({
    name: input.name,
    shortName,
    category: input.category,
    link: input.link,
    logoUrl: image.imageUrl,
    imageSource: image.imageSource,
    blobPathname: image.blobPathname,
    logoAlt: input.logoAlt === "" ? shortName : input.logoAlt,
    status: input.status,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateClient(
  id: string,
  input: UpdateClientInput,
  actor: CmsActor,
): Promise<ClientDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidClientId(id)) {
    return null;
  }

  const previous = await clientRepository.findById(id);
  if (!previous) {
    return null;
  }

  const patch: Partial<Omit<ClientDocument, "_id" | "createdAt">> = {};
  for (const field of TEXT_FIELDS) {
    const value = input[field];
    if (value !== undefined) {
      // Field-by-field assignment keeps the assignment type-safe; a spread of
      // the parsed body would also copy logo fields we handle explicitly.
      (patch as Record<string, unknown>)[field] = value;
    }
  }

  // Ownership metadata is rewritten when the logo itself changes OR when the
  // record stops being an upload. A text-only edit therefore leaves legacy rows
  // (no imageSource) exactly as they were, and never modifies storage.
  //
  // The source transition matters even when the URL string is identical
  // ("upload -> external" with the seeded Blob URL left in the field): the
  // record must clear blobPathname and release the object it no longer owns.
  const sourceChanged =
    input.imageSource !== undefined &&
    input.imageSource !== (previous.imageSource ?? "external");
  const imageChanged =
    (typeof input.logoUrl === "string" && input.logoUrl !== previous.logoUrl) ||
    sourceChanged;

  if (imageChanged) {
    const image = await resolveCmsImageForWrite({
      imageUrl: (input.logoUrl as string | undefined) ?? previous.logoUrl,
      imageSource: input.imageSource,
      blobPathname: input.blobPathname,
    });
    patch.logoUrl = image.imageUrl;
    patch.imageSource = image.imageSource;
    patch.blobPathname = image.blobPathname;
  }

  patch.updatedAt = new Date();
  const updated = await clientRepository.updateById(id, patch);
  if (!updated) {
    return null;
  }

  // Storage cleanup runs strictly after the database write succeeded: a failure
  // here only leaves an orphan object, it can never lose the live logo.
  if (imageChanged) {
    await deleteReplacedCmsImage(logoOwnership(previous), {
      imageUrl: updated.logoUrl,
      imageSource: updated.imageSource,
    });
  }
  return updated;
}

export async function deleteClient(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidClientId(id)) {
    return false;
  }
  const previous = await clientRepository.findById(id);
  if (!previous) {
    return false;
  }
  const deleted = await clientRepository.deleteById(id);
  if (!deleted) {
    return false;
  }
  if (isCmsOwnedImage(logoOwnership(previous))) {
    await deleteCmsImageIfUnreferenced(previous.blobPathname as string);
  }
  return true;
}
