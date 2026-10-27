import { ObjectId } from "mongodb";
import * as socialPostRepository from "@/lib/social-posts/social-post.repository";
import { assertCanManageCms, type CmsActor } from "@/lib/cms/access";
import type {
  CreateSocialPostInput,
  UpdateSocialPostInput,
} from "@/lib/social-posts/social-post.schema";
import type { SocialPostDocument, SocialPostPublic } from "@/lib/social-posts/social-post.types";

// Business rules live here. Route handlers stay thin.
//
// RBAC consolidation Phase 3: every management operation (list/detail/create/
// update/delete) asserts CMS_MANAGE in this domain layer, not only in the route
// handler. `listPublicSocialPosts` is the public landing read and stays open.

export function isValidSocialPostId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listSocialPosts(actor: CmsActor): Promise<SocialPostDocument[]> {
  assertCanManageCms(actor.role);
  return socialPostRepository.findAll();
}

export async function listPublicSocialPosts(): Promise<SocialPostPublic[]> {
  return socialPostRepository.findPublishedPublic();
}

export async function getSocialPostById(
  id: string,
  actor: CmsActor,
): Promise<SocialPostDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidSocialPostId(id)) {
    return null;
  }
  return socialPostRepository.findById(id);
}

export async function createSocialPost(
  input: CreateSocialPostInput,
  actor: CmsActor,
): Promise<SocialPostDocument> {
  assertCanManageCms(actor.role);
  const maxSortOrder = await socialPostRepository.getMaxSortOrder();
  const now = new Date();
  return socialPostRepository.insertOne({
    platform: input.platform,
    account: input.account,
    caption: input.caption,
    url: input.url,
    type: input.type,
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt === "" ? input.account : input.imageAlt,
    status: input.status,
    sortOrder: input.sortOrder ?? (maxSortOrder === null ? 1 : maxSortOrder + 1),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateSocialPost(
  id: string,
  input: UpdateSocialPostInput,
  actor: CmsActor,
): Promise<SocialPostDocument | null> {
  assertCanManageCms(actor.role);
  if (!isValidSocialPostId(id)) {
    return null;
  }
  return socialPostRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteSocialPost(id: string, actor: CmsActor): Promise<boolean> {
  assertCanManageCms(actor.role);
  if (!isValidSocialPostId(id)) {
    return false;
  }
  return socialPostRepository.deleteById(id);
}
