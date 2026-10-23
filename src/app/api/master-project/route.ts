import { NextResponse } from "next/server";
import { createMasterProjectSchema } from "@/lib/master-project/schema";
import {
  createMasterProject,
  listMasterProjects,
} from "@/lib/master-project/service";
import { getActor, mapDomainError, parseJsonBody } from "./_helpers";

export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    const items = await listMasterProjects(auth.actor, q);
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/master-project failed", error);
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
    const parsed = createMasterProjectSchema.safeParse(parsedBody.body);
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
      const created = await createMasterProject(auth.actor, parsed.data);
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/master-project failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
