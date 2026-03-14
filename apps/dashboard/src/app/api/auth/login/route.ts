import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyPassword, createUser, getUsers } from "@/lib/users";
import { createJwt, AUTH_COOKIE } from "@/lib/auth";
import { createCsrfToken, CSRF_COOKIE } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/security-log";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Auto-create admin on first login if no users exist
    const users = await getUsers();
    if (users.length === 0) {
      await createUser(username, password, "admin");
    }

    const user = await verifyPassword(username, password);
    if (!user) {
      logSecurityEvent("login_failed", { detail: username, ip: request.headers.get("x-forwarded-for") || "unknown" });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createJwt(user.username, user.role);
    const csrf = createCsrfToken();

    logSecurityEvent("login_success", { detail: username, ip: request.headers.get("x-forwarded-for") || "unknown" });

    const res = NextResponse.json({ success: true, role: user.role });
    res.cookies.set(AUTH_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 });
    res.cookies.set(CSRF_COOKIE, csrf, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 86400 });
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
