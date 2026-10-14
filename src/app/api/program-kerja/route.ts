import { NextResponse } from "next/server";
import { createProgram, listPrograms } from "@/lib/program-kerja/service";
import { createProgramKerjaSchema } from "@/lib/program-kerja/schema";
import { getActor, mapDomainError, parseJsonBody } from "./_helpers";

export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const programs = await listPrograms(auth.actor);
    return NextResponse.json({ data: programs }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/program-kerja failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;
    const parsed = createProgramKerjaSchema.safeParse(parsedBody.body);
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
      const created = await createProgram(auth.actor, parsed.data);
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/program-kerja failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
