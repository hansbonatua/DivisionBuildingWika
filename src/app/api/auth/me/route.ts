import { NextResponse } from "next/server";
import { getCurrentUser, requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import { updateOwnProfile, UserNotFoundError } from "@/lib/users/service";
import { profileUpdateSchema } from "@/lib/users/schema";

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

export async function PATCH(request: Request) {
  try {
    let actorId: string;
    try {
      actorId = (await requireUser()).id;
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        return NextResponse.json({ error: { message: "Unauthenticated" } }, { status: 401 });
      }
      throw error;
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
    // Explicit empty-body check: zod v4 skips object-level refinements on
    // schemas with transformed fields, so this stays a route-level rule.
    if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: { message: "Body update tidak boleh kosong" } },
        { status: 400 },
      );
    }
    const parsed = profileUpdateSchema.safeParse(body);
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
      // Unknown/admin keys (role/status/nip/email/position) are stripped by
      // the schema and can never reach the update — self-edit only.
      const updated = await updateOwnProfile(actorId, parsed.data);
      return NextResponse.json({ user: updated }, { status: 200 });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return NextResponse.json({ error: { message: "User tidak ditemukan" } }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/auth/me failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
