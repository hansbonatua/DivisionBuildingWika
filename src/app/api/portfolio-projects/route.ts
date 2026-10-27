import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { createPortfolioProjectSchema } from "@/lib/portfolio-projects/portfolio-project.schema";
import * as portfolioProjectService from "@/lib/portfolio-projects/portfolio-project.service";
import { serializePortfolioProjectDocument } from "@/lib/portfolio-projects/portfolio-project.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).
// The public landing feed lives at /api/portfolio-projects/public and stays
// unauthenticated.

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const projects = await portfolioProjectService.listPortfolioProjects(auth.actor);
    return NextResponse.json({ data: projects.map(serializePortfolioProjectDocument) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/portfolio-projects failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
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
    const parsed = createPortfolioProjectSchema.safeParse(body);
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
    const created = await portfolioProjectService.createPortfolioProject(parsed.data, auth.actor);
    return NextResponse.json({ data: serializePortfolioProjectDocument(created) }, { status: 201 });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("POST /api/portfolio-projects failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
