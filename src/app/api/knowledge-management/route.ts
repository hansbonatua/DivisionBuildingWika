import { NextResponse } from "next/server";
import {
  createKnowledgeEntry,
  listKnowledgeRecords,
} from "@/lib/knowledge-management/service";
import {
  createKnowledgeEntrySchema,
  knowledgeTypeQuerySchema,
} from "@/lib/knowledge-management/schema";
import {
  getActor,
  mapDomainError,
  parseJsonBody,
  validationErrorResponse,
} from "./_helpers";

// GET /api/knowledge-management?type=lesson_learn|best_practice|va_ve
// Returns RECORD rows only. Master Projects without a knowledge record never
// appear because the service starts from knowledge_entries.
export async function GET(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const parsedType = knowledgeTypeQuerySchema.safeParse({
      type: new URL(request.url).searchParams.get("type") ?? "",
    });
    if (!parsedType.success) {
      return NextResponse.json(
        {
          error: {
            message: "Tipe knowledge tidak valid",
            details: parsedType.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const rows = await listKnowledgeRecords(auth.actor, parsedType.data.type);
    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/knowledge-management failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

// POST /api/knowledge-management?type=...
// Creates a new record aggregate: entry + PIC list + exactly one evidence.
export async function POST(request: Request) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const parsedType = knowledgeTypeQuerySchema.safeParse({
      type: new URL(request.url).searchParams.get("type") ?? "",
    });
    if (!parsedType.success) {
      return NextResponse.json(
        {
          error: {
            message: "Tipe knowledge tidak valid",
            details: parsedType.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = createKnowledgeEntrySchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const created = await createKnowledgeEntry(
      auth.actor,
      parsedType.data.type,
      parsed.data,
    );
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("POST /api/knowledge-management failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
