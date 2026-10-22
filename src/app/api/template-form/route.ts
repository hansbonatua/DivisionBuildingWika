import { NextResponse } from "next/server";
import { createTemplateFormSchema } from "@/lib/template-form/schema";
import {
  createTemplateForm,
  listTemplateForms,
} from "@/lib/template-form/service";
import { getActor, mapDomainError, parseJsonBody } from "./_helpers";

export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const items = await listTemplateForms(auth.actor);
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/template-form failed", error);
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
    const parsed = createTemplateFormSchema.safeParse(parsedBody.body);
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
      const created = await createTemplateForm(auth.actor, parsed.data);
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return mapped;
      throw error;
    }
  } catch (error) {
    console.error("POST /api/template-form failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
