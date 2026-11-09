import { NextResponse } from "next/server";
import {
  isCstCategoryId,
  type CstCategoryId,
} from "@/lib/calculation-sheet-template/constants";
import { createCalculationSheetTemplateSchema } from "@/lib/calculation-sheet-template/schema";
import {
  createTemplate,
  listTemplates,
} from "@/lib/calculation-sheet-template/service";
import { badRequest, getActor, handleRouteError, parseJsonBody } from "./_helpers";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// GET /api/calculation-sheet-template[?kategori=xxx]
// Flat, deterministic list (category, kode, id). Without `kategori` the whole
// master list is returned for the Summary Report; with it, only that category.
export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const rawKategori = new URL(request.url).searchParams.get("kategori");
    let kategori: CstCategoryId | undefined;
    if (rawKategori !== null) {
      const normalized = rawKategori.trim();
      if (!isCstCategoryId(normalized)) {
        return badRequest("Kategori tidak dikenal");
      }
      kategori = normalized;
    }

    const rows = await listTemplates(actor, kategori);
    return NextResponse.json(
      { data: { rows } },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/calculation-sheet-template failed");
  }
}

// POST /api/calculation-sheet-template
// `kategori` is part of create but never of update.
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(request, createCalculationSheetTemplateSchema);
    const data = await createTemplate(actor, input);
    return NextResponse.json({ data }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "POST /api/calculation-sheet-template failed");
  }
}
