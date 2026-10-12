import { NextResponse } from "next/server";
import { apiAuthGuard } from "@/lib/auth/current-user";
import { listSafeUsers } from "@/lib/users/service";

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
