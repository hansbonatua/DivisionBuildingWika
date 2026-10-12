import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: { message: "Unauthenticated" } }, { status: 401 });
    }
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
