import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getDevices, getDevice, registerDevice, updateDeviceMetrics,
  updateDeviceStatus, removeDevice, sendDeviceCommand, getDeviceCommands,
  type Platform, type DeviceMetrics,
} from "@/lib/devices";

// GET /api/devices             → list all devices
// GET /api/devices?id=xxx      → get single device
// GET /api/devices?commands=1  → list commands
// GET /api/devices?commands=1&deviceId=xxx → commands for device
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const commands = request.nextUrl.searchParams.get("commands");
  const deviceId = request.nextUrl.searchParams.get("deviceId");

  if (commands) {
    const cmds = await getDeviceCommands(deviceId || undefined);
    return NextResponse.json({ commands: cmds });
  }

  if (id) {
    const device = await getDevice(id);
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });
    return NextResponse.json({ device });
  }

  const devices = await getDevices();
  return NextResponse.json({ devices });
}

// POST /api/devices → register new device or send command
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Send command to device
    if (body.action === "command") {
      const { deviceId, type, payload } = body;
      if (!deviceId || !type) {
        return NextResponse.json({ error: "deviceId and type required" }, { status: 400 });
      }
      const cmd = await sendDeviceCommand(deviceId, type, payload || {});
      return NextResponse.json({ command: cmd });
    }

    // Register new device
    const { name, platform, hostname, ip, agentVersion, osVersion, metrics, capabilities, tags } = body;
    if (!name || !platform) {
      return NextResponse.json({ error: "name and platform required" }, { status: 400 });
    }
    const device = await registerDevice({
      name,
      platform: platform as Platform,
      hostname: hostname || "unknown",
      ip: ip || request.headers.get("x-forwarded-for") || "unknown",
      agentVersion: agentVersion || "unknown",
      osVersion: osVersion || "unknown",
      metrics: metrics || {
        cpuUsage: 0, memoryUsed: 0, memoryTotal: 0,
        diskUsed: 0, diskTotal: 0, batteryLevel: -1,
        batteryCharging: false, uptime: 0, networkLatency: 0,
      },
      capabilities: capabilities || [],
      tags: tags || [],
    });
    return NextResponse.json({ device }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/devices → update device metrics or status
export async function PATCH(request: NextRequest) {
  try {
    const { id, metrics, status } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (metrics) {
      const ok = await updateDeviceMetrics(id, metrics as DeviceMetrics, status);
      if (!ok) return NextResponse.json({ error: "Device not found" }, { status: 404 });
    } else if (status) {
      const ok = await updateDeviceStatus(id, status);
      if (!ok) return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/devices?id=xxx → remove device
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await removeDevice(id);
  if (!ok) return NextResponse.json({ error: "Device not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
