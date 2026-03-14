import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const N8N_URL = process.env.N8N_API_URL || "http://localhost:5678";
const N8N_KEY = process.env.N8N_API_KEY || "";

async function proxyRequest(request: NextRequest, method: string) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  const target = `${N8N_URL}/api/v1${path}`;
  const headers: Record<string, string> = { "X-N8N-API-KEY": N8N_KEY, "Content-Type": "application/json" };
  const opts: RequestInit = { method, headers };
  if (["POST", "PATCH", "PUT"].includes(method)) {
    try { opts.body = await request.text(); } catch { /* no body */ }
  }
  try {
    const r = await fetch(target, opts);
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch { return NextResponse.json({ error: "n8n unreachable" }, { status: 502 }); }
}

export async function GET(req: NextRequest) { return proxyRequest(req, "GET"); }
export async function POST(req: NextRequest) { return proxyRequest(req, "POST"); }
export async function PATCH(req: NextRequest) { return proxyRequest(req, "PATCH"); }
export async function DELETE(req: NextRequest) { return proxyRequest(req, "DELETE"); }
