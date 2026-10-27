import { ObjectId } from "mongodb";
import * as heroRepository from "@/lib/heroes/hero.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import type { CreateHeroInput, UpdateHeroInput } from "@/lib/heroes/hero.schema";
import type { HeroDocument, HeroPublic } from "@/lib/heroes/hero.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicHeroes` is the public landing read and stays open.

export function isValidHeroId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listHeroes(actor: CmsActor): Promise<HeroDocument[]> {
  assertCanManageCms(actor.role);
  return heroRepository.findAll();
}

export async function listPublicHeroes(): Promise<HeroPublic[]> {
  return heroRepository.findActivePublic();
}

export async function getHero(id: string, actor: CmsActor): Promise<HeroDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidHeroId(id)) {
    return null;
  }
  return heroRepository.findById(id);
}

export async function createHero(
  input: CreateHeroInput,
  actor: CmsActor,
): Promise<HeroDocument> {
  assertCanManageCms(actor.role);
  const maxSortOrder = await heroRepository.getMaxSortOrder();
  const now = new Date();
  return heroRepository.insertOne({
    title: input.title,
    projectName: input.projectName,
    location: input.location,
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt,
    description: input.description,
    status: input.status,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateHero(
  id: string,
  input: UpdateHeroInput,
  actor: CmsActor,
): Promise<HeroDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidHeroId(id)) {
    return null;
  }
  return heroRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteHero(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidHeroId(id)) {
    return false;
  }
  return heroRepository.deleteById(id);
}
