import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Chat history is now stored in localStorage (client-side only).
// This API route exists for backward compatibility and returns
// empty results, directing clients to use localStorage directly.

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  // Chat history is stored client-side in localStorage
  return NextResponse.json({ messages: [], source: "client-storage" });
}

export async function DELETE(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  // Chat history is managed client-side
  return NextResponse.json({ success: true, source: "client-storage" });
}
