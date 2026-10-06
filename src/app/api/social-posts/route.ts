import { NextResponse } from "next/server";
import { createSocialPostSchema } from "@/lib/social-posts/social-post.schema";
import * as socialPostService from "@/lib/social-posts/social-post.service";
import { serializeSocialPostDocument } from "@/lib/social-posts/social-post.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

export async function GET() {
  try {
    const posts = await socialPostService.listSocialPosts();
    return NextResponse.json({ data: posts.map(serializeSocialPostDocument) });
  } catch (error) {
    console.error("GET /api/social-posts failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    const created = await socialPostService.createSocialPost(parsed.data);
    return NextResponse.json({ data: serializeSocialPostDocument(created) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/social-posts failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
