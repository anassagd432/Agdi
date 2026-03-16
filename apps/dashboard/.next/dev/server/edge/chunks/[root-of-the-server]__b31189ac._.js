(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__b31189ac._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/auth.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUTH_COOKIE",
    ()=>AUTH_COOKIE,
    "createJwt",
    ()=>createJwt,
    "verifyJwt",
    ()=>verifyJwt
]);
// ── Auth helpers ──────────────────────────────────────────────────────────
// JWT + session validation. Edge-compatible (no Node.js crypto).
const JWT_SECRET = process.env.JWT_SECRET || "agdi-dashboard-dev-secret";
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24h
function base64url(data) {
    return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(data) {
    const padded = data.replace(/-/g, "+").replace(/_/g, "/");
    return atob(padded);
}
function createJwt(sub, role) {
    const header = base64url(JSON.stringify({
        alg: "HS256",
        typ: "JWT"
    }));
    const now = Date.now();
    const payload = base64url(JSON.stringify({
        sub,
        role,
        iat: now,
        exp: now + TOKEN_TTL
    }));
    // Simplified HMAC — in production use Web Crypto API
    const sig = base64url(JWT_SECRET + "." + header + "." + payload);
    return `${header}.${payload}.${sig}`;
}
function verifyJwt(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(base64urlDecode(parts[1]));
        if (payload.exp < Date.now()) return null;
        // Verify signature
        const expectedSig = base64url(JWT_SECRET + "." + parts[0] + "." + parts[1]);
        if (parts[2] !== expectedSig) return null;
        return payload;
    } catch  {
        return null;
    }
}
const AUTH_COOKIE = "agdi-token";
}),
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/csrf.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ── CSRF Protection ───────────────────────────────────────────────────────
// Double-submit cookie pattern (Edge-compatible).
__turbopack_context__.s([
    "CSRF_COOKIE",
    ()=>CSRF_COOKIE,
    "CSRF_HEADER",
    ()=>CSRF_HEADER,
    "createCsrfToken",
    ()=>createCsrfToken,
    "validateCsrf",
    ()=>validateCsrf
]);
const CSRF_COOKIE = "agdi-csrf";
const CSRF_HEADER = "x-csrf-token";
function generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b)=>b.toString(16).padStart(2, "0")).join("");
}
function createCsrfToken() {
    return generateToken();
}
function validateCsrf(cookieVal, headerVal) {
    if (!cookieVal || !headerVal) return false;
    return cookieVal === headerVal;
}
}),
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/security-log.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ── Security Event Logger ─────────────────────────────────────────────────
// Edge-compatible audit logger. Uses in-memory buffer for the edge runtime.
__turbopack_context__.s([
    "getSecurityEvents",
    ()=>getSecurityEvents,
    "logSecurityEvent",
    ()=>logSecurityEvent
]);
const MAX_MEMORY_EVENTS = 500;
const events = [];
let nextId = 1;
function logSecurityEvent(type, opts) {
    const event = {
        id: `sec-${nextId++}`,
        ts: Date.now(),
        type,
        ip: opts?.ip,
        ua: opts?.ua ? opts.ua.slice(0, 120) : undefined,
        detail: opts?.detail?.slice(0, 256)
    };
    events.push(event);
    if (events.length > MAX_MEMORY_EVENTS) events.splice(0, events.length - MAX_MEMORY_EVENTS);
    if (type === "login_locked_out" || type === "session_fingerprint_mismatch" || type === "csrf_rejected") {
        console.warn(`[security] ${type}`, opts);
    }
}
async function getSecurityEvents() {
    return [
        ...events
    ].reverse();
}
}),
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/auth.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$csrf$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/csrf.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/security-log.ts [middleware-edge] (ecmascript)");
;
;
;
;
const PUBLIC_PATHS = [
    "/login",
    "/api/auth/login",
    "/api/auth/refresh"
];
function middleware(request) {
    const { pathname } = request.nextUrl;
    // Skip public paths
    if (PUBLIC_PATHS.some((p)=>pathname.startsWith(p))) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Skip static assets
    if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname === "/manifest.json") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Check JWT auth
    const token = request.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["AUTH_COOKIE"])?.value;
    if (!token) {
        if (pathname.startsWith("/api/")) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", request.url));
    }
    const payload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["verifyJwt"])(token);
    if (!payload) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logSecurityEvent"])("session_fingerprint_mismatch", {
            ip: request.headers.get("x-forwarded-for") || "unknown"
        });
        if (pathname.startsWith("/api/")) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid token"
            }, {
                status: 401
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", request.url));
    }
    // CSRF check for mutations
    if ([
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ].includes(request.method)) {
        const csrfCookie = request.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$csrf$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["CSRF_COOKIE"])?.value;
        const csrfHeader = request.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$csrf$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["CSRF_HEADER"]);
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$csrf$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["validateCsrf"])(csrfCookie, csrfHeader)) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logSecurityEvent"])("csrf_rejected", {
                ip: request.headers.get("x-forwarded-for") || "unknown"
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "CSRF validation failed"
            }, {
                status: 403
            });
        }
    }
    // Redirect root to dashboard
    if (pathname === "/") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/dashboard", request.url));
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__b31189ac._.js.map