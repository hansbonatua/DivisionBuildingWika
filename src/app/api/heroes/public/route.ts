import { NextResponse } from "next/server";
import * as heroService from "@/lib/heroes/hero.service";

// Public landing feed: active heroes only, display fields only. No auth needed.
export async function GET() {
  try {
    const heroes = await heroService.listPublicHeroes();
    return NextResponse.json({ data: heroes });
  } catch (error) {
    console.error("GET /api/heroes/public failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
