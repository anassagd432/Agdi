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
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/app/api/security/events/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/security-log.ts [app-route] (ecmascript)");
;
;
async function GET() {
    const events = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$security$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSecurityEvents"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        events
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__766e7dc0._.js.map