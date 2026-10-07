import { NextResponse } from "next/server";
import { createPortfolioProjectSchema } from "@/lib/portfolio-projects/portfolio-project.schema";
import * as portfolioProjectService from "@/lib/portfolio-projects/portfolio-project.service";
import { serializePortfolioProjectDocument } from "@/lib/portfolio-projects/portfolio-project.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

export async function GET() {
  try {
    const projects = await portfolioProjectService.listPortfolioProjects();
    return NextResponse.json({ data: projects.map(serializePortfolioProjectDocument) });
  } catch (error) {
    console.error("GET /api/portfolio-projects failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    const created = await portfolioProjectService.createPortfolioProject(parsed.data);
    return NextResponse.json({ data: serializePortfolioProjectDocument(created) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/portfolio-projects failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
