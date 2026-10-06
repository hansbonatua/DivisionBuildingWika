import { NextResponse } from "next/server";
import { createClientSchema } from "@/lib/clients/client.schema";
import * as clientService from "@/lib/clients/client.service";
import { serializeClientDocument } from "@/lib/clients/client.types";

// NOTE: temporarily unauthenticated (dev stage). Add auth checks here later.

export async function GET() {
  try {
    const clients = await clientService.listClients();
    return NextResponse.json({ data: clients.map(serializeClientDocument) });
  } catch (error) {
    console.error("GET /api/clients failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    const created = await clientService.createClient(parsed.data);
    return NextResponse.json({ data: serializeClientDocument(created) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients failed", error);
    return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
  }
}
