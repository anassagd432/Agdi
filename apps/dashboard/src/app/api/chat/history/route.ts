import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loadChatHistory, clearChatHistory } from "@/lib/chat-history";

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  return NextResponse.json({ messages: await loadChatHistory(agentId) });
}

export async function DELETE(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  await clearChatHistory(agentId);
  return NextResponse.json({ success: true });
}
