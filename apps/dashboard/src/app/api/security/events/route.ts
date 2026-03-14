import { NextResponse } from "next/server";
import { getSecurityEvents } from "@/lib/security-log";

export async function GET() {
  const events = await getSecurityEvents();
  return NextResponse.json({ events });
}
