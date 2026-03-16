module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/users.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createUser",
    ()=>createUser,
    "deleteUser",
    ()=>deleteUser,
    "getUsers",
    ()=>getUsers,
    "updateUserRole",
    ()=>updateUserRole,
    "verifyPassword",
    ()=>verifyPassword
]);
// ── User store ────────────────────────────────────────────────────────────
// JSON-backed user store at ~/.agdi/dashboard/users.json
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
;
const DATA_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].homedir(), ".agdi", "dashboard");
const USERS_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(DATA_DIR, "users.json");
async function ensureDir() {
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].mkdir(DATA_DIR, {
        recursive: true
    });
}
function hashPassword(password, salt) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}
async function loadUsers() {
    try {
        const raw = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(USERS_FILE, "utf-8");
        return JSON.parse(raw);
    } catch  {
        return [];
    }
}
async function saveUsers(users) {
    await ensureDir();
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}
async function getUsers() {
    return loadUsers();
}
async function createUser(username, password, role = "viewer") {
    const users = await loadUsers();
    if (users.some((u)=>u.username === username)) {
        throw new Error("Username already exists");
    }
    const salt = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomBytes(16).toString("hex");
    const user = {
        id: __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID(),
        username,
        passwordHash: hashPassword(password, salt),
        salt,
        role,
        createdAt: Date.now()
    };
    users.push(user);
    await saveUsers(users);
    return user;
}
async function verifyPassword(username, password) {
    const users = await loadUsers();
    const user = users.find((u)=>u.username === username);
    if (!user) return null;
    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return null;
    user.lastLogin = Date.now();
    await saveUsers(users);
    return user;
}
async function deleteUser(id) {
    const users = await loadUsers();
    const filtered = users.filter((u)=>u.id !== id);
    if (filtered.length === users.length) return false;
    await saveUsers(filtered);
    return true;
}
async function updateUserRole(id, role) {
    const users = await loadUsers();
    const user = users.find((u)=>u.id === id);
    if (!user) return false;
    user.role = role;
    await saveUsers(users);
    return true;
}
}),
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/csrf.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/security-log.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/app/api/auth/login/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$users$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/users.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/csrf.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/security-log.ts [app-route] (ecmascript)");
;
;
;
;
;
async function POST(request) {
    try {
        const { username, password } = await request.json();
        if (!username || !password) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Missing credentials"
            }, {
                status: 400
            });
        }
        // Auto-create admin on first login if no users exist
        const users = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$users$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getUsers"])();
        if (users.length === 0) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$users$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createUser"])(username, password, "admin");
        }
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$users$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyPassword"])(username, password);
        if (!user) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logSecurityEvent"])("login_failed", {
                detail: username,
                ip: request.headers.get("x-forwarded-for") || "unknown"
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid credentials"
            }, {
                status: 401
            });
        }
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createJwt"])(user.username, user.role);
        const csrf = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createCsrfToken"])();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logSecurityEvent"])("login_success", {
            detail: username,
            ip: request.headers.get("x-forwarded-for") || "unknown"
        });
        const res = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            role: user.role
        });
        res.cookies.set(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AUTH_COOKIE"], token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 86400
        });
        res.cookies.set(__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CSRF_COOKIE"], csrf, {
            httpOnly: false,
            sameSite: "lax",
            path: "/",
            maxAge: 86400
        });
        return res;
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Login failed"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__cfd30e25._.js.map