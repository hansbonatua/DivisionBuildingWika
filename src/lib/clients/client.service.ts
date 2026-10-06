import { ObjectId } from "mongodb";
import * as clientRepository from "@/lib/clients/client.repository";
import type { CreateClientInput, UpdateClientInput } from "@/lib/clients/client.schema";
import type { ClientDocument, ClientPublic } from "@/lib/clients/client.types";

// Business rules live here. Route handlers stay thin.
// NOTE: endpoints are temporarily unauthenticated (dev stage);
// add auth checks at the route/middleware layer later without touching this file.

export function isValidClientId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listClients(): Promise<ClientDocument[]> {
  return clientRepository.findAll();
}

export async function listPublicClients(): Promise<ClientPublic[]> {
  return clientRepository.findActivePublic();
}

export async function getClient(id: string): Promise<ClientDocument | null> {
  if (!isValidClientId(id)) {
    return null;
  }
  return clientRepository.findById(id);
}

export async function createClient(input: CreateClientInput): Promise<ClientDocument> {
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
): Promise<ClientDocument | null> {
  if (!isValidClientId(id)) {
    return null;
  }
  return clientRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteClient(id: string): Promise<boolean> {
  if (!isValidClientId(id)) {
    return false;
  }
  return clientRepository.deleteById(id);
}
