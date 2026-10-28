import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { mapCmsImageError } from "@/lib/cms/error-response";
import { createClientSchema } from "@/lib/clients/client.schema";
import * as clientService from "@/lib/clients/client.service";
import { serializeClientDocument } from "@/lib/clients/client.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).
// The public landing feed lives at /api/clients/public and stays unauthenticated.

export async function GET() {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const clients = await clientService.listClients(auth.actor);
    return NextResponse.json({ data: clients.map(serializeClientDocument) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/clients failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }
    const parsed = createClientSchema.safeParse(body);
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
    const created = await clientService.createClient(parsed.data, auth.actor);
    return NextResponse.json({ data: serializeClientDocument(created) }, { status: 201 });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    // Uploaded-logo verification and CMS store failures are client/storage
    // problems, never an opaque 500.
    const cmsImageError = mapCmsImageError(error);
    if (cmsImageError) return cmsImageError;
    console.error("POST /api/clients failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
