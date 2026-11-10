import { NextResponse } from "next/server";
import {
  createBerkas,
  listBerkas,
  listBerkasAssignments,
} from "@/lib/berkas/service";
import { createBerkasSchema } from "@/lib/berkas/schema";
import {
  getActor,
  mapDomainError,
  parseJsonBody,
} from "./_helpers";

export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const [rows, assignments] = await Promise.all([
      listBerkas(auth.actor),
      listBerkasAssignments(auth.actor),
    ]);
    return NextResponse.json({ data: rows, assignments }, { status: 200 });
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
