import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const KNOWLEDGE_DIR = path.join(os.homedir(), ".agdi", "dashboard", "knowledge");
async function ensureDir() { await fs.mkdir(KNOWLEDGE_DIR, { recursive: true }); }

export async function GET() {
  try {
    await ensureDir();
    const files = await fs.readdir(KNOWLEDGE_DIR);
    const infos = await Promise.all(files.map(async (name) => {
      const stat = await fs.stat(path.join(KNOWLEDGE_DIR, name));
      return { name, size: stat.size, uploadedAt: stat.mtimeMs };
    }));
    return NextResponse.json({ files: infos });
  } catch { return NextResponse.json({ files: [] }); }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDir();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(KNOWLEDGE_DIR, safeName), buffer);
    return NextResponse.json({ name: safeName, size: buffer.length, uploadedAt: Date.now() });
  } catch { return NextResponse.json({ error: "Upload failed" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    await fs.unlink(path.join(KNOWLEDGE_DIR, name.replace(/[^a-zA-Z0-9._-]/g, "_")));
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}
