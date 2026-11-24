import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor } from "@/lib/auth/require-permission";
import { getSasaaKnowledgePage } from "@/lib/dashboard/sasaa-service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ projectId: string }> };

function notFound() {
  return NextResponse.json(
    { error: { message: "Master Project tidak ditemukan" } },
    { status: 404 },
  );
}

// Absent/empty -> page 1. Anything that is not a positive integer is rejected
// instead of being silently coerced, so a typo cannot hide data.
function parsePage(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") {
    return 1;
  }
  if (!/^\d+$/.test(raw.trim())) {
    return null;
  }
  const page = Number.parseInt(raw.trim(), 10);
  return page >= 1 ? page : null;
}

export async function GET(request: Request, context: RouteContext) {
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

    const page = parsePage(new URL(request.url).searchParams.get("page"));
    if (page === null) {
      return NextResponse.json(
        { error: { message: "Parameter page harus bilangan bulat minimal 1" } },
        { status: 400 },
      );
    }

    const data = await getSasaaKnowledgePage(projectId, page);
    if (!data) return notFound();

    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/dashboard/sasaa/[projectId]/knowledge failed",
      error,
    );
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
