import { ObjectId } from "mongodb";
import * as socialPostRepository from "@/lib/social-posts/social-post.repository";
import type {
  CreateSocialPostInput,
  UpdateSocialPostInput,
} from "@/lib/social-posts/social-post.schema";
import type { SocialPostDocument, SocialPostPublic } from "@/lib/social-posts/social-post.types";

// Business rules live here. Route handlers stay thin.
// NOTE: endpoints are temporarily unauthenticated (dev stage);
// add auth checks at the route/middleware layer later without touching this file.

export function isValidSocialPostId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function listSocialPosts(): Promise<SocialPostDocument[]> {
  return socialPostRepository.findAll();
}

export async function listPublicSocialPosts(): Promise<SocialPostPublic[]> {
  return socialPostRepository.findPublishedPublic();
}

export async function getSocialPostById(id: string): Promise<SocialPostDocument | null> {
  if (!isValidSocialPostId(id)) {
    return null;
  }
  return socialPostRepository.findById(id);
}

export async function createSocialPost(input: CreateSocialPostInput): Promise<SocialPostDocument> {
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
): Promise<SocialPostDocument | null> {
  if (!isValidSocialPostId(id)) {
    return null;
  }
  return socialPostRepository.updateById(id, { ...input, updatedAt: new Date() });
}

export async function deleteSocialPost(id: string): Promise<boolean> {
  if (!isValidSocialPostId(id)) {
    return false;
  }
  return socialPostRepository.deleteById(id);
}
