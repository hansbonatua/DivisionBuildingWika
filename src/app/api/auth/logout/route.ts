import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await deleteSessionByToken(token);
    }
    const response = NextResponse.json({ data: { loggedOut: true } }, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/logout failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
