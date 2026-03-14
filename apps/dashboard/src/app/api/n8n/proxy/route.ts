/**
 * Server-side proxy to n8n API.
 * Avoids CORS and keeps n8n credentials server-side.
 *
 * GET /api/n8n/proxy?path=/workflows
 * POST /api/n8n/proxy?path=/workflows/:id/execute
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getN8nConfig() {
  const baseUrl =
    process.env.N8N_API_URL ||
    process.env.N8N_BASE_URL ||
    "http://localhost:5678";
  const apiKey = process.env.N8N_API_KEY || "";

  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function proxyRequest(request: NextRequest, method: string) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter." },
      { status: 400 },
    );
  }

  const { baseUrl, apiKey } = getN8nConfig();

  if (!baseUrl) {
    return NextResponse.json(
      { error: "n8n not configured. Set N8N_API_URL environment variable." },
      { status: 503 },
    );
  }

  const url = `${baseUrl}/api/v1${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (apiKey) {
    headers["X-N8N-API-KEY"] = apiKey;
  }

  try {
    let body: string | undefined;
    if (method !== "GET" && method !== "HEAD") {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: `Failed to reach n8n at ${baseUrl}: ${err.message || "Connection refused"}`,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyRequest(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxyRequest(request, "POST");
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request, "PATCH");
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request, "DELETE");
}
