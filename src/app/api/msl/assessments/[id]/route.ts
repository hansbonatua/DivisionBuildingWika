import { NextResponse } from "next/server";
import { updateMslAssessmentSchema } from "@/lib/msl/schema";
import { deleteMslAssessment, updateMslAssessment } from "@/lib/msl/service";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
  parseJsonBody,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/msl/assessments/[id]
// Only the three components and remarks are mutable. projectId is absent from
// the contract (an assessment cannot be moved between projects) and is rejected
// by the strict schema, as are score/category/actor fields.
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;
    if (
      typeof parsedBody.body !== "object" ||
      parsedBody.body === null ||
      Object.keys(parsedBody.body).length === 0
    ) {
      return NextResponse.json(
        { error: { message: "Body update tidak boleh kosong" } },
        { status: 400 },
      );
    }

    const parsed = updateMslAssessmentSchema.safeParse(parsedBody.body);
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
      const updated = await updateMslAssessment(auth.actor, id, parsed.data);
      return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/msl/assessments/[id] failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

// DELETE /api/msl/assessments/[id]
// Removes only the assessment row; the Master Project is never touched.
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    try {
      const result = await deleteMslAssessment(auth.actor, id);
      return NextResponse.json({ data: result }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("DELETE /api/msl/assessments/[id] failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
