import { NextResponse } from "next/server";
import { apiAuthGuard } from "@/lib/auth/current-user";
import { getSafeUserById } from "@/lib/users/service";

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
