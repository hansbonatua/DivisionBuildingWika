import { ObjectId } from "mongodb";
import * as portfolioProjectRepository from "@/lib/portfolio-projects/portfolio-project.repository";
import type {
  CreatePortfolioProjectInput,
  UpdatePortfolioProjectInput,
} from "@/lib/portfolio-projects/portfolio-project.schema";
import type {
  PortfolioProjectDocument,
  PortfolioProjectPublic,
} from "@/lib/portfolio-projects/portfolio-project.types";

// Business rules live here. Route handlers stay thin.
// NOTE: endpoints are temporarily unauthenticated (dev stage);
// add auth checks at the route/middleware layer later without touching this file.

export function isValidPortfolioProjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listPortfolioProjects(): Promise<PortfolioProjectDocument[]> {
  return portfolioProjectRepository.findAll();
}

export async function listPublicPortfolioProjects(): Promise<PortfolioProjectPublic[]> {
  return portfolioProjectRepository.findActivePublic();
}

export async function getPortfolioProjectById(id: string): Promise<PortfolioProjectDocument | null> {
  if (!isValidPortfolioProjectId(id)) {
    return null;
  }
  return portfolioProjectRepository.findById(id);
}

export async function createPortfolioProject(
  input: CreatePortfolioProjectInput,
): Promise<PortfolioProjectDocument> {
  const maxSortOrder = await portfolioProjectRepository.getMaxSortOrder();
  const now = new Date();
  return portfolioProjectRepository.insertOne({
    title: input.title,
    category: input.category,
    location: input.location,
    progress: input.progress,
    status: input.status,
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt === "" ? input.title : input.imageAlt,
    description: input.description,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePortfolioProject(
  id: string,
  input: UpdatePortfolioProjectInput,
): Promise<PortfolioProjectDocument | null> {
  if (!isValidPortfolioProjectId(id)) {
    return null;
  }
  return portfolioProjectRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deletePortfolioProject(id: string): Promise<boolean> {
  if (!isValidPortfolioProjectId(id)) {
    return false;
  }
  return portfolioProjectRepository.deleteById(id);
}
