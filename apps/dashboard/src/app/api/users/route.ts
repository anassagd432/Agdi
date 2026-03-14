import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUsers, createUser, deleteUser, updateUserRole } from "@/lib/users";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json({ users: users.map(({ passwordHash, salt, ...u }) => u) });
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, role } = await request.json();
    if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const user = await createUser(username, password, role || "viewer");
    return NextResponse.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const ok = await deleteUser(id);
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { id, role } = await request.json();
  if (!id || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const ok = await updateUserRole(id, role);
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
