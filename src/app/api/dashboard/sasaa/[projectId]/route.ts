import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor } from "@/lib/auth/require-permission";
import { getSasaaData } from "@/lib/dashboard/sasaa-service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ projectId: string }> };

function notFound() {
  return NextResponse.json(
    { error: { message: "Master Project tidak ditemukan" } },
    { status: 404 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.DASHBOARD_SASAA_VIEW);
    if ("response" in auth) return auth.response;

    const { projectId } = await context.params;
    if (!UUID_RE.test(projectId)) {
      return NextResponse.json(
        { error: { message: "ID Master Project tidak valid" } },
        { status: 400 },
      );
    }

    const data = await getSasaaData(projectId);
    if (!data) return notFound();

    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("GET /api/dashboard/sasaa/[projectId] failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
