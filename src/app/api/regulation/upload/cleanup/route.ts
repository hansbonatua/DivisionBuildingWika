import { NextResponse } from "next/server";
import { deleteRegulationBlobSchema } from "@/lib/regulation/schema";
import { deleteRegulationBlobIfUnreferenced } from "@/lib/regulation/service";
import {
  getActor,
  handleRouteError,
  parseJsonBody,
} from "../../_helpers";

// POST /api/regulation/upload/cleanup
//
// Narrow orphan cleanup: one Regulation pathname, never an arbitrary blob key.
// The service refuses to delete a pathname still referenced by a document row.
export async function POST(request: Request) {
  try {
    const actor = await getActor();
    const input = await parseJsonBody(
      request,
      deleteRegulationBlobSchema,
    );
    const data = await deleteRegulationBlobIfUnreferenced(
      actor,
      input.pathname,
    );
    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(
      error,
      "POST /api/regulation/upload/cleanup failed",
    );
  }
}
