import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { mapCmsImageError } from "@/lib/cms/error-response";
import { updateSocialPostSchema } from "@/lib/social-posts/social-post.schema";
import * as socialPostService from "@/lib/social-posts/social-post.service";
import { serializeSocialPostDocument } from "@/lib/social-posts/social-post.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!socialPostService.isValidSocialPostId(id)) {
      return NextResponse.json({ error: { message: "ID post tidak valid" } }, { status: 400 });
    }
    const post = await socialPostService.getSocialPostById(id, auth.actor);
    if (!post) {
      return NextResponse.json({ error: { message: "Post tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeSocialPostDocument(post) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/social-posts/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!socialPostService.isValidSocialPostId(id)) {
      return NextResponse.json({ error: { message: "ID post tidak valid" } }, { status: 400 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }
    if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: { message: "Body update tidak boleh kosong" } },
        { status: 400 },
      );
    }
    const parsed = updateSocialPostSchema.safeParse(body);
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
    const updated = await socialPostService.updateSocialPost(id, parsed.data, auth.actor);
    if (!updated) {
      return NextResponse.json({ error: { message: "Post tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeSocialPostDocument(updated) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    // Uploaded-image verification and CMS store failures are client/storage
    // problems, never an opaque 500.
    const cmsImageError = mapCmsImageError(error);
    if (cmsImageError) return cmsImageError;
    console.error("PATCH /api/social-posts/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!socialPostService.isValidSocialPostId(id)) {
      return NextResponse.json({ error: { message: "ID post tidak valid" } }, { status: 400 });
    }
    const deleted = await socialPostService.deleteSocialPost(id, auth.actor);
    if (!deleted) {
      return NextResponse.json({ error: { message: "Post tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("DELETE /api/social-posts/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
