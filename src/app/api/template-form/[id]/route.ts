import { NextResponse } from "next/server";
import { updateTemplateFormSchema } from "@/lib/template-form/schema";
import {
  deleteTemplateForm,
  getTemplateForm,
  updateTemplateForm,
} from "@/lib/template-form/service";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
  parseJsonBody,
} from "../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();
    try {
      const item = await getTemplateForm(auth.actor, id);
      return NextResponse.json({ data: item }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("GET /api/template-form/[id] failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

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
    const parsed = updateTemplateFormSchema.safeParse(parsedBody.body);
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
      const updated = await updateTemplateForm(auth.actor, id, parsed.data);
      return NextResponse.json({ data: updated }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/template-form/[id] failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();
    try {
      const result = await deleteTemplateForm(auth.actor, id);
      return NextResponse.json({ data: result }, { status: 200 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("DELETE /api/template-form/[id] failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
