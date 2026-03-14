/**
 * API Keys REST route — admin-only.
 * GET: list keys
 * POST: create key
 * DELETE: revoke key
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys";

export async function GET() {
  const keys = await listApiKeys();
  // Strip hashes from response
  const safe = keys.map(({ hash, ...rest }) => rest);
  return NextResponse.json({ keys: safe });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Key name is required." },
        { status: 400 },
      );
    }

    const { key, record } = await createApiKey(
      name.trim(),
      "admin", // TODO: extract from session
    );

    return NextResponse.json({
      key, // Only returned once
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      createdAt: record.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create API key." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Key ID is required." },
      { status: 400 },
    );
  }

  const revoked = await revokeApiKey(id);
  if (!revoked) {
    return NextResponse.json({ error: "Key not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
