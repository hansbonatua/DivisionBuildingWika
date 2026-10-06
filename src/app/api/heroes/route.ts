import { NextResponse } from "next/server";
import { createHeroSchema } from "@/lib/heroes/hero.schema";
import * as heroService from "@/lib/heroes/hero.service";
import { serializeHeroDocument } from "@/lib/heroes/hero.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

export async function GET() {
  try {
    const heroes = await heroService.listHeroes();
    return NextResponse.json({ data: heroes.map(serializeHeroDocument) });
  } catch (error) {
    console.error("GET /api/heroes failed", error);
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
    const parsed = createHeroSchema.safeParse(body);
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
    const created = await heroService.createHero(parsed.data);
    return NextResponse.json({ data: serializeHeroDocument(created) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/heroes failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
