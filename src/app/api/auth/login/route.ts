import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/schema";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/auth/password";
import {
  LOGIN_LOCKOUT_MESSAGE,
  evaluateLoginThrottle,
  recordLoginAttempt,
} from "@/lib/auth/login-attempts";
import {
  createSession,
  sessionMaxAge,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { getUserForLoginByNip, toSafeUser } from "@/lib/users/service";

// NOTE: authentication foundation (P3). No RBAC here.
//
// Security hardening (V1):
//   - temporary NIP-keyed lockout, evaluated BEFORE any credential work;
//   - one bcrypt verification for every request, including unknown NIPs;
//   - one ledger row per credential outcome (hashed identity, success flag, time).

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

    // Lockout gate first. A locked identity triggers NO user lookup and NO
    // bcrypt work, so a guessing run cannot use this endpoint as a CPU
    // amplifier, and the 429 body is identical for known and unknown NIPs.
    const throttle = await evaluateLoginThrottle(nip);
    if (throttle.locked) {
      return NextResponse.json(
        { error: { message: LOGIN_LOCKOUT_MESSAGE } },
        {
          status: 429,
          headers: { "Retry-After": String(throttle.retryAfterSeconds) },
        },
      );
    }

    const user = await getUserForLoginByNip(nip);

    // Constant work: an absent account still pays one bcrypt verification
    // against the fixed dummy hash, so timing cannot distinguish
    // "unknown NIP" from "wrong password". Same function, same cost, same
    // order of magnitude as a real account.
    const passwordOk = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordOk) {
      await recordLoginAttempt(nip, false);
      return NextResponse.json({ error: { message: GENERIC_UNAUTHORIZED } }, { status: 401 });
    }

    // Suspended accounts keep the previous behaviour exactly: correct
    // credentials produce a deterministic 403, and the attempt is not counted
    // as a credential failure, so the lockout can never mask the suspension.
    if (user.status !== "active") {
      return NextResponse.json({ error: { message: "Account is suspended" } }, { status: 403 });
    }

    // Success neutralizes the streak: only failures recorded after this row are
    // counted by the throttle, so nothing has to be deleted or reset.
    await recordLoginAttempt(nip, true);

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
