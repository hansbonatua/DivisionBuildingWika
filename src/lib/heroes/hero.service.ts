import { ObjectId } from "mongodb";
import * as heroRepository from "@/lib/heroes/hero.repository";
import type { CreateHeroInput, UpdateHeroInput } from "@/lib/heroes/hero.schema";
import type { HeroDocument, HeroPublic } from "@/lib/heroes/hero.types";

// Business rules live here. Route handlers stay thin.
// NOTE: endpoints are temporarily unauthenticated (dev stage);
// add auth checks at the route/middleware layer later without touching this file.

export function isValidHeroId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listHeroes(): Promise<HeroDocument[]> {
  return heroRepository.findAll();
}

export async function listPublicHeroes(): Promise<HeroPublic[]> {
  return heroRepository.findActivePublic();
}

export async function getHero(id: string): Promise<HeroDocument | null> {
  if (!isValidHeroId(id)) {
    return null;
  }
  return heroRepository.findById(id);
}

export async function createHero(input: CreateHeroInput): Promise<HeroDocument> {
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

export async function updateHero(id: string, input: UpdateHeroInput): Promise<HeroDocument | null> {
  if (!isValidHeroId(id)) {
    return null;
  }
  return heroRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteHero(id: string): Promise<boolean> {
  if (!isValidHeroId(id)) {
    return false;
  }
  return heroRepository.deleteById(id);
}
