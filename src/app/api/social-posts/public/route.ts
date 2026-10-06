import { NextResponse } from "next/server";
import * as socialPostService from "@/lib/social-posts/social-post.service";

// Public landing feed: Published posts only, display fields only. No auth needed.
export async function GET() {
  try {
    const posts = await socialPostService.listPublicSocialPosts();
    return NextResponse.json({ data: posts });
  } catch (error) {
    console.error("GET /api/social-posts/public failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
