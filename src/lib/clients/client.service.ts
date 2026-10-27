import { ObjectId } from "mongodb";
import * as clientRepository from "@/lib/clients/client.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import type { CreateClientInput, UpdateClientInput } from "@/lib/clients/client.schema";
import type { ClientDocument, ClientPublic } from "@/lib/clients/client.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicClients` is the public landing read and stays open.

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
  const maxSortOrder = await clientRepository.getMaxSortOrder();
  const shortName = input.shortName === "" ? input.name : input.shortName;
  const now = new Date();
  return clientRepository.insertOne({
    name: input.name,
    shortName,
    category: input.category,
    link: input.link,
    logoUrl: input.logoUrl,
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
  return clientRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteClient(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidClientId(id)) {
    return false;
  }
  return clientRepository.deleteById(id);
}
