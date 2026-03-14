/**
 * Knowledge file upload API.
 * Stores uploads at ~/.agdi/dashboard/knowledge/ and lists them.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const KNOWLEDGE_DIR = path.join(os.homedir(), ".agdi", "dashboard", "knowledge");

async function ensureDir() {
  await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
}

/**
 * GET /api/knowledge/upload — list uploaded files
 */
export async function GET() {
  try {
    await ensureDir();
    const files = await fs.readdir(KNOWLEDGE_DIR);
    const fileInfos = await Promise.all(
      files.map(async (name) => {
        const stat = await fs.stat(path.join(KNOWLEDGE_DIR, name));
        return {
          name,
          size: stat.size,
          uploadedAt: stat.mtimeMs,
        };
      }),
    );
    return NextResponse.json({ files: fileInfos });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

/**
 * POST /api/knowledge/upload — upload a file
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDir();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 },
      );
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(KNOWLEDGE_DIR, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      name: safeName,
      size: buffer.length,
      uploadedAt: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/knowledge/upload?name=file.txt — delete a file
 */
export async function DELETE(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json(
      { error: "File name is required." },
      { status: 400 },
    );
  }

  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(KNOWLEDGE_DIR, safeName);

  try {
    await fs.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
