/**
 * Chat history API — load and clear per-agent chat history.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loadChatHistory, clearChatHistory } from "@/lib/chat-history";

/**
 * GET /api/chat/history?agentId=xxx — load chat history
 */
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json(
      { error: "agentId is required." },
      { status: 400 },
    );
  }

  const messages = await loadChatHistory(agentId);
  return NextResponse.json({ messages });
}

/**
 * DELETE /api/chat/history?agentId=xxx — clear chat history
 */
export async function DELETE(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json(
      { error: "agentId is required." },
      { status: 400 },
    );
  }

  await clearChatHistory(agentId);
  return NextResponse.json({ success: true });
}
