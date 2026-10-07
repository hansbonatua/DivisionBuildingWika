import { NextResponse } from "next/server";
import { updatePortfolioProjectSchema } from "@/lib/portfolio-projects/portfolio-project.schema";
import * as portfolioProjectService from "@/lib/portfolio-projects/portfolio-project.service";
import { serializePortfolioProjectDocument } from "@/lib/portfolio-projects/portfolio-project.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!portfolioProjectService.isValidPortfolioProjectId(id)) {
      return NextResponse.json({ error: { message: "ID project tidak valid" } }, { status: 400 });
    }
    const project = await portfolioProjectService.getPortfolioProjectById(id);
    if (!project) {
      return NextResponse.json({ error: { message: "Project tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializePortfolioProjectDocument(project) });
  } catch (error) {
    console.error("GET /api/portfolio-projects/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!portfolioProjectService.isValidPortfolioProjectId(id)) {
      return NextResponse.json({ error: { message: "ID project tidak valid" } }, { status: 400 });
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
    if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: { message: "Body update tidak boleh kosong" } },
        { status: 400 },
      );
    }
    const parsed = updatePortfolioProjectSchema.safeParse(body);
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
    const updated = await portfolioProjectService.updatePortfolioProject(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: { message: "Project tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializePortfolioProjectDocument(updated) });
  } catch (error) {
    console.error("PATCH /api/portfolio-projects/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!portfolioProjectService.isValidPortfolioProjectId(id)) {
      return NextResponse.json({ error: { message: "ID project tidak valid" } }, { status: 400 });
    }
    const deleted = await portfolioProjectService.deletePortfolioProject(id);
    if (!deleted) {
      return NextResponse.json({ error: { message: "Project tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/portfolio-projects/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
