import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermittedActor, mapPermissionError } from "@/lib/auth/require-permission";
import { mapCmsImageError } from "@/lib/cms/error-response";
import { updateClientSchema } from "@/lib/clients/client.schema";
import * as clientService from "@/lib/clients/client.service";
import { serializeClientDocument } from "@/lib/clients/client.types";

// Landing Page CMS management API — ADMIN ONLY (CMS_MANAGE).

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!clientService.isValidClientId(id)) {
      return NextResponse.json({ error: { message: "ID client tidak valid" } }, { status: 400 });
    }
    const client = await clientService.getClient(id, auth.actor);
    if (!client) {
      return NextResponse.json({ error: { message: "Client tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeClientDocument(client) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("GET /api/clients/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!clientService.isValidClientId(id)) {
      return NextResponse.json({ error: { message: "ID client tidak valid" } }, { status: 400 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Body harus berupa JSON yang valid" } },
        { status: 400 },
      );
    }
    if (typeof body !== "object" || body === null || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: { message: "Body update tidak boleh kosong" } },
        { status: 400 },
      );
    }
    const parsed = updateClientSchema.safeParse(body);
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
    const updated = await clientService.updateClient(id, parsed.data, auth.actor);
    if (!updated) {
      return NextResponse.json({ error: { message: "Client tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeClientDocument(updated) });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    // Uploaded-logo verification and CMS store failures are client/storage
    // problems, never an opaque 500.
    const cmsImageError = mapCmsImageError(error);
    if (cmsImageError) return cmsImageError;
    console.error("PATCH /api/clients/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getPermittedActor(PERMISSIONS.CMS_MANAGE);
    if ("response" in auth) return auth.response;
    const { id } = await context.params;
    if (!clientService.isValidClientId(id)) {
      return NextResponse.json({ error: { message: "ID client tidak valid" } }, { status: 400 });
    }
    const deleted = await clientService.deleteClient(id, auth.actor);
    if (!deleted) {
      return NextResponse.json({ error: { message: "Client tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const mapped = mapPermissionError(error);
    if (mapped) return mapped;
    console.error("DELETE /api/clients/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
