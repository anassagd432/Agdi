import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys";

export async function GET() {
  const keys = await listApiKeys();
  const safe = keys.map(({ hash, ...rest }) => rest);
  return NextResponse.json({ keys: safe });
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: "Key name required" }, { status: 400 });
    const { key, record } = await createApiKey(name.trim(), "admin");
    return NextResponse.json({ key, id: record.id, name: record.name, prefix: record.prefix, createdAt: record.createdAt });
  } catch { return NextResponse.json({ error: "Failed to create key" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Key ID required" }, { status: 400 });
  const revoked = await revokeApiKey(id);
  if (!revoked) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
