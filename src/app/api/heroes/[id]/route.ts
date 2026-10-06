import { NextResponse } from "next/server";
import { updateHeroSchema } from "@/lib/heroes/hero.schema";
import * as heroService from "@/lib/heroes/hero.service";
import { serializeHeroDocument } from "@/lib/heroes/hero.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!heroService.isValidHeroId(id)) {
      return NextResponse.json({ error: { message: "ID hero tidak valid" } }, { status: 400 });
    }
    const hero = await heroService.getHero(id);
    if (!hero) {
      return NextResponse.json({ error: { message: "Hero tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeHeroDocument(hero) });
  } catch (error) {
    console.error("GET /api/heroes/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!heroService.isValidHeroId(id)) {
      return NextResponse.json({ error: { message: "ID hero tidak valid" } }, { status: 400 });
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
    const parsed = updateHeroSchema.safeParse(body);
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
    const updated = await heroService.updateHero(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: { message: "Hero tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeHeroDocument(updated) });
  } catch (error) {
    console.error("PATCH /api/heroes/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!heroService.isValidHeroId(id)) {
      return NextResponse.json({ error: { message: "ID hero tidak valid" } }, { status: 400 });
    }
    const deleted = await heroService.deleteHero(id);
    if (!deleted) {
      return NextResponse.json({ error: { message: "Hero tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/heroes/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
