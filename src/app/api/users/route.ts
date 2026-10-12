import { NextResponse } from "next/server";
import { apiAuthGuard } from "@/lib/auth/current-user";
import {
  createSafeUser,
  DuplicateEmailError,
  DuplicateNipError,
  listSafeUsers,
} from "@/lib/users/service";
import { createUserSchema } from "@/lib/users/schema";

export async function GET() {
  try {
    const denied = await apiAuthGuard();
    if (denied) return denied;
    const users = await listSafeUsers();
    return NextResponse.json({ data: users }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const denied = await apiAuthGuard();
    if (denied) return denied;
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
      const created = await createSafeUser(parsed.data);
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
    console.error("POST /api/users failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
