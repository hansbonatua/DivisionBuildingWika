import { NextResponse } from "next/server";
import { requireTemplateFormManageActor } from "@/app/api/template-form/upload/_guard";
import { deleteTemplateFormBlobSchema } from "@/lib/template-form/schema";
import { deleteTemplateFormBlobIfUnreferenced } from "@/lib/template-form/service";
import { mapDomainError, parseJsonBody } from "../../_helpers";

// Orphan upload cleanup.
//
// Narrow on purpose: the caller names ONE Template & Form storage pathname, the
// server re-validates it against the namespace and refuses to delete anything a
// template_forms row still references. There is no generic blob-delete surface
// exposed to the browser.

export async function POST(request: Request) {
  try {
    const auth = await requireTemplateFormManageActor();
    if ("response" in auth) return auth.response;

    const parsedBody = await parseJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsed = deleteTemplateFormBlobSchema.safeParse(parsedBody.body);
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

    const result = await deleteTemplateFormBlobIfUnreferenced(
      auth.actor,
      parsed.data.pathname,
    );
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("POST /api/template-form/upload/cleanup failed", error);
    return NextResponse.json(
      { error: { message: "Gagal menghapus file upload." } },
      { status: 500 },
    );
  }
}
