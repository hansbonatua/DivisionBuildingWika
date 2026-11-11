import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor } from "@/lib/auth/require-permission";
import { listSasaaProjects } from "@/lib/dashboard/sasaa-service";

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.DASHBOARD_SASAA_VIEW);
    if ("response" in auth) return auth.response;

    const data = await listSasaaProjects();
    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("GET /api/dashboard/sasaa failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
