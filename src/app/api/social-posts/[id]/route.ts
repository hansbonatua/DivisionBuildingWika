import { NextResponse } from "next/server";
import { updateSocialPostSchema } from "@/lib/social-posts/social-post.schema";
import * as socialPostService from "@/lib/social-posts/social-post.service";
import { serializeSocialPostDocument } from "@/lib/social-posts/social-post.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!socialPostService.isValidSocialPostId(id)) {
      return NextResponse.json({ error: { message: "ID post tidak valid" } }, { status: 400 });
    }
    const post = await socialPostService.getSocialPostById(id);
    if (!post) {
      return NextResponse.json({ error: { message: "Post tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeSocialPostDocument(post) });
  } catch (error) {
    console.error("GET /api/social-posts/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
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
    const updated = await socialPostService.updateSocialPost(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: { message: "Post tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeSocialPostDocument(updated) });
  } catch (error) {
    console.error("PATCH /api/social-posts/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!socialPostService.isValidSocialPostId(id)) {
      return NextResponse.json({ error: { message: "ID post tidak valid" } }, { status: 400 });
    }
    const deleted = await socialPostService.deleteSocialPost(id);
    if (!deleted) {
      return NextResponse.json({ error: { message: "Post tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/social-posts/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
