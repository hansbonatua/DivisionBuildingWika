import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import {
  CannotDeleteLastAdminError,
  CannotDeleteSelfError,
  CannotSuspendLastAdminError,
  CannotSuspendSelfError,
  DuplicateEmailError,
  DuplicateNipError,
  deleteUserSafely,
  getSafeUserById,
  updateSafeUser,
  UserConflictError,
  UserNotFoundError,
} from "@/lib/users/service";
import { updateUserSchema } from "@/lib/users/schema";

// User Control API — ADMIN ONLY (USER_MANAGE).
// Authorization runs before id validation and body parsing so a non-Admin
// request is denied with 403 and performs no DB mutation. Self/last-Admin
// integrity protections below still apply to Admin itself.
// Self-service lives in /api/auth/me and is not routed through here.

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.USER_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: { message: "ID user tidak valid" } }, { status: 400 });
    }
    const user = await getSafeUserById(id, auth.actor.role);
    if (!user) {
      return NextResponse.json({ error: { message: "User tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: user }, { status: 200 });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/users/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.USER_MANAGE);
    if ("response" in auth) return auth.response;
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
      const updated = await updateSafeUser(id, parsed.data, auth.actor.id, auth.actor.role);
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
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("PATCH /api/users/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.USER_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: { message: "ID user tidak valid" } }, { status: 400 });
    }
    try {
      const result = await deleteUserSafely(id, auth.actor.id, auth.actor.role);
      return NextResponse.json({ data: result }, { status: 200 });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return NextResponse.json({ error: { message: "User tidak ditemukan" } }, { status: 404 });
      }
      if (error instanceof CannotDeleteSelfError) {
        return NextResponse.json(
          { error: { message: "Anda tidak dapat menghapus akun sendiri" } },
          { status: 403 },
        );
      }
      if (error instanceof CannotDeleteLastAdminError) {
        return NextResponse.json(
          { error: { message: "Admin aktif terakhir tidak dapat dihapus" } },
          { status: 403 },
        );
      }
      // Referenced user: friendly 409 with the domain wording only — never a
      // SQLSTATE, constraint name or driver detail.
      if (error instanceof UserConflictError) {
        return NextResponse.json({ error: { message: error.message } }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("DELETE /api/users/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
