import { getRegulationDocumentFile } from "@/lib/regulation/service";
import { contentDispositionAttachment } from "@/lib/storage/blob";
import {
  getActor,
  handleRouteError,
  invalidIdResponse,
  isUuid,
} from "../../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/regulation/document/[id]/file
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) return invalidIdResponse();

    const actor = await getActor();
    const file = await getRegulationDocumentFile(actor, id);

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
    return handleRouteError(
      error,
      "GET /api/regulation/document/[id]/file failed",
    );
  }
}
