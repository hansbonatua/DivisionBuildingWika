import { NextResponse } from "next/server";
import { updateClientSchema } from "@/lib/clients/client.schema";
import * as clientService from "@/lib/clients/client.service";
import { serializeClientDocument } from "@/lib/clients/client.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!clientService.isValidClientId(id)) {
      return NextResponse.json({ error: { message: "ID client tidak valid" } }, { status: 400 });
    }
    const client = await clientService.getClient(id);
    if (!client) {
      return NextResponse.json({ error: { message: "Client tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeClientDocument(client) });
  } catch (error) {
    console.error("GET /api/clients/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
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
    const updated = await clientService.updateClient(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: { message: "Client tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: serializeClientDocument(updated) });
  } catch (error) {
    console.error("PATCH /api/clients/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!clientService.isValidClientId(id)) {
      return NextResponse.json({ error: { message: "ID client tidak valid" } }, { status: 400 });
    }
    const deleted = await clientService.deleteClient(id);
    if (!deleted) {
      return NextResponse.json({ error: { message: "Client tidak ditemukan" } }, { status: 404 });
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/clients/[id] failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
