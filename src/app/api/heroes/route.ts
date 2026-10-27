import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { createHeroSchema } from "@/lib/heroes/hero.schema";
import * as heroService from "@/lib/heroes/hero.service";
import { serializeHeroDocument } from "@/lib/heroes/hero.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).
// The public landing feed lives at /api/heroes/public and stays unauthenticated.

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const heroes = await heroService.listHeroes(auth.actor);
    return NextResponse.json({ data: heroes.map(serializeHeroDocument) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/heroes failed", error);
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
    const created = await heroService.createHero(parsed.data, auth.actor);
    return NextResponse.json({ data: serializeHeroDocument(created) }, { status: 201 });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("POST /api/heroes failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
