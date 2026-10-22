import { NextResponse } from "next/server";
import { listTemplateFormPicOptions } from "@/lib/template-form/service";
import { getActor, mapDomainError } from "../_helpers";

export async function GET() {
  try {
    const auth = await getActor();
    if ("response" in auth) return auth.response;
    const options = await listTemplateFormPicOptions(auth.actor);
    return NextResponse.json({ data: options }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/template-form/pic-options failed", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 },
    );
  }
}
