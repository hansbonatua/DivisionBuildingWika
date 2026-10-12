import { NextResponse } from "next/server";
import { apiAuthGuard, requireUser, UnauthenticatedError } from "@/lib/auth/current-user";
import {
  CannotSuspendLastAdminError,
  CannotSuspendSelfError,
  DuplicateEmailError,
  DuplicateNipError,
  getSafeUserById,
  updateSafeUser,
  UserNotFoundError,
} from "@/lib/users/service";
import { updateUserSchema } from "@/lib/users/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const denied = await apiAuthGuard();
    if (denied) return denied;
    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: { message: "ID user tidak valid" } }, { status: 400 });
    }
    const user = await getSafeUserById(id);
    if (!user) {
      return NextResponse.json({ error: { message: "User tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: { message: "ID user tidak valid" } }, { status: 400 });
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
    // NOTE: explicit empty-body check (mirrors social-posts PATCH convention):
    // zod v4 skips object-level .refine() when the schema contains transformed
    // fields, so an empty object would otherwise pass validation.
    if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: { message: "Body update tidak boleh kosong" } },
        { status: 400 },
      );
    }
    const parsed = updateUserSchema.safeParse(body);
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
      const updated = await updateSafeUser(id, parsed.data, actorId);
      return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return NextResponse.json({ error: { message: "User tidak ditemukan" } }, { status: 404 });
      }
      if (error instanceof DuplicateNipError) {
        return NextResponse.json({ error: { message: "NIP already exists" } }, { status: 409 });
      }
      if (error instanceof DuplicateEmailError) {
        return NextResponse.json({ error: { message: "Email already exists" } }, { status: 409 });
      }
      if (error instanceof CannotSuspendSelfError) {
        return NextResponse.json(
          { error: { message: "Anda tidak dapat menonaktifkan akun sendiri" } },
          { status: 403 },
        );
      }
      if (error instanceof CannotSuspendLastAdminError) {
        return NextResponse.json(
          { error: { message: "Admin aktif terakhir tidak dapat dinonaktifkan" } },
          { status: 403 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/users/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
