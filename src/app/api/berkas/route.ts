import { NextResponse } from "next/server";
import {
  createBerkas,
  listBerkasAssignments,
  listBerkasPage,
} from "@/lib/berkas/service";
import { createBerkasSchema } from "@/lib/berkas/schema";
import {
  getActor,
  mapDomainError,
  parseJsonBody,
} from "./_helpers";

function parsePageParam(value: string | null, fallback: number): number | null {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const page = parsePageParam(url.searchParams.get("page"), 1);
    const limit = parsePageParam(url.searchParams.get("limit"), 10);
    if (search.length > 100 || page === null || limit === null || limit > 100) {
      return NextResponse.json(
        {
          error: {
            message:
              "Parameter tidak valid: search maksimal 100 karakter, page >= 1, limit 1–100",
          },
        },
        { status: 400 },
      );
    }

    const result = await listBerkasPage(auth.actor, { search, page, limit });
    const assignments = await listBerkasAssignments(
      auth.actor,
      result.data.map((item) => item.id),
    );
    return NextResponse.json(
      {
        data: result.data,
        assignments,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalData: result.totalData,
          totalPages: result.totalPages,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/berkas failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = createBerkasSchema.safeParse(parsedBody.body);
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

    try {
      const created = await createBerkas(auth.actor, parsed.data);
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/berkas failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
