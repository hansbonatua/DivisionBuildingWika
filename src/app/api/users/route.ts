import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import {
  createSafeUser,
  DuplicateEmailError,
  DuplicateNipError,
  listSafeUsers,
} from "@/lib/users/service";
import { createUserSchema } from "@/lib/users/schema";

// User Control API — ADMIN ONLY (USER_MANAGE).
// Authorization runs before body parsing so a non-Admin request is denied with
// 403 and can never reach validation or the database. The service layer
// asserts the same permission again (defense in depth).

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.USER_MANAGE);
    if ("response" in auth) return auth.response;
    const users = await listSafeUsers(auth.actor.role);
    return NextResponse.json({ data: users }, { status: 200 });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/users failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.USER_MANAGE);
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
    const parsed = createUserSchema.safeParse(body);
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
    try {
      const created = await createSafeUser(parsed.data, auth.actor.role);
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      if (error instanceof DuplicateNipError) {
        return NextResponse.json({ error: { message: "NIP already exists" } }, { status: 409 });
      }
      if (error instanceof DuplicateEmailError) {
        return NextResponse.json({ error: { message: "Email already exists" } }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("POST /api/users failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
