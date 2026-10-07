import { NextResponse } from "next/server";
import * as portfolioProjectService from "@/lib/portfolio-projects/portfolio-project.service";

// Public landing feed: Active projects only, display fields only. No auth needed.
export async function GET() {
  try {
    const projects = await portfolioProjectService.listPublicPortfolioProjects();
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("GET /api/portfolio-projects/public failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
