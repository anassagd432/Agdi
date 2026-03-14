/**
 * User management API — admin only.
 *
 * GET  /api/users        → list all users
 * POST /api/users        → create user { username, password, role }
 * DELETE /api/users?id=x → delete user
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { listUsers, createUser, deleteUser, updateUserRole } from "@/lib/users";
import type { UserRole } from "@/lib/users";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list users." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const { username, password, role } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    if (role && !["admin", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'viewer'." },
        { status: 400 },
      );
    }

    const user = await createUser(username, password, (role as UserRole) || "viewer");
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create user." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete user." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const { id, role } = await request.json();
    if (!id || !role || !["admin", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Valid user ID and role (admin/viewer) required." },
        { status: 400 },
      );
    }

    await updateUserRole(id, role as UserRole);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update role." },
      { status: 400 },
    );
  }
}
