import { NextResponse } from "next/server";

/**
 * Health check endpoint for Docker/load balancer probes.
 * Returns 200 if the dashboard process is alive.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "agdi-dashboard",
    timestamp: new Date().toISOString(),
  });
}
