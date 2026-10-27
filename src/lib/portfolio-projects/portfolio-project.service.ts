import { ObjectId } from "mongodb";
import * as portfolioProjectRepository from "@/lib/portfolio-projects/portfolio-project.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import type {
  CreatePortfolioProjectInput,
  UpdatePortfolioProjectInput,
} from "@/lib/portfolio-projects/portfolio-project.schema";
import type {
  PortfolioProjectDocument,
  PortfolioProjectPublic,
} from "@/lib/portfolio-projects/portfolio-project.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicPortfolioProjects` is the public landing read and stays open.

export function isValidPortfolioProjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listPortfolioProjects(
  actor: CmsActor,
): Promise<PortfolioProjectDocument[]> {
  assertCanManageCms(actor.role);
  return portfolioProjectRepository.findAll();
}

export async function listPublicPortfolioProjects(): Promise<PortfolioProjectPublic[]> {
  return portfolioProjectRepository.findActivePublic();
}

export async function getPortfolioProjectById(
  id: string,
  actor: CmsActor,
): Promise<PortfolioProjectDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidPortfolioProjectId(id)) {
    return null;
  }
  return portfolioProjectRepository.findById(id);
}

export async function createPortfolioProject(
  input: CreatePortfolioProjectInput,
  actor: CmsActor,
): Promise<PortfolioProjectDocument> {
  assertCanManageCms(actor.role);
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
  actor: CmsActor,
): Promise<PortfolioProjectDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidPortfolioProjectId(id)) {
    return null;
  }
  return portfolioProjectRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deletePortfolioProject(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidPortfolioProjectId(id)) {
    return false;
  }
  return portfolioProjectRepository.deleteById(id);
}
