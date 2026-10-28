import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { mapCmsImageError } from "@/lib/cms/error-response";
import { createSocialPostSchema } from "@/lib/social-posts/social-post.schema";
import * as socialPostService from "@/lib/social-posts/social-post.service";
import { serializeSocialPostDocument } from "@/lib/social-posts/social-post.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).
// The public landing feed lives at /api/social-posts/public and stays
// unauthenticated.

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const posts = await socialPostService.listSocialPosts(auth.actor);
    return NextResponse.json({ data: posts.map(serializeSocialPostDocument) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/social-posts failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }
    const parsed = createSocialPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: "Validasi gagal",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }
    const created = await socialPostService.createSocialPost(parsed.data, auth.actor);
    return NextResponse.json({ data: serializeSocialPostDocument(created) }, { status: 201 });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    // Uploaded-image verification and CMS store failures are client/storage
    // problems, never an opaque 500.
    const cmsImageError = mapCmsImageError(error);
    if (cmsImageError) return cmsImageError;
    console.error("POST /api/social-posts failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
