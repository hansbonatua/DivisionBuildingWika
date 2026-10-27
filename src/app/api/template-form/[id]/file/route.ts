import { NextResponse } from "next/server";
import { getTemplateFormFile } from "@/lib/template-form/service";
import { contentDispositionAttachment } from "@/lib/template-form/storage-path";
import {
  getActor,
  invalidIdResponse,
  isUuid,
  mapDomainError,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// Authenticated private download proxy.
//
// The record id is the ONLY file selector accepted from the client — never a
// pathname, URL or storage key. WIBEX authorizes every request (TEMPLATE_FORM
// VIEW: Admin, Head Office, Project, Management) and streams the private object
// itself; no signed/public URL is ever handed to the browser.

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const auth = await getActor();
    if ("response" in auth) return auth.response;

    const file = await getTemplateFormFile(auth.actor, id);

    return new Response(file.stream, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": contentDispositionAttachment(file.fileName),
        "Content-Length": String(file.size),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    console.error("GET /api/template-form/[id]/file failed", error);
    return NextResponse.json(
      { error: { message: "Gagal mengunduh file." } },
      { status: 500 },
    );
  }
}
