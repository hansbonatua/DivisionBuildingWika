import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  sessionMaxAge,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { getUserForLoginByNip, toSafeUser } from "@/lib/users/service";

// NOTE: authentication foundation (P3). No RBAC here.

const GENERIC_UNAUTHORIZED = "Invalid NIP or password";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: { message: "Invalid request body" } }, { status: 400 });
    }
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { message: "Invalid request body" } }, { status: 400 });
    }
    const { nip, password, remember } = parsed.data;

    const user = await getUserForLoginByNip(nip);
    if (!user) {
      return NextResponse.json({ error: { message: GENERIC_UNAUTHORIZED } }, { status: 401 });
    }
    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json({ error: { message: GENERIC_UNAUTHORIZED } }, { status: 401 });
    }
    if (user.status !== "active") {
      return NextResponse.json({ error: { message: "Account is suspended" } }, { status: 403 });
    }

    // Session policy: multiple concurrent sessions allowed (multi-device).
    // Old sessions are left intact; logout revokes individually.
    const { token } = await createSession(user.id, remember);

    const response = NextResponse.json({ user: toSafeUser(user) }, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge(remember),
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
