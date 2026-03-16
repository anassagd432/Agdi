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
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/devices.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "detectPlatform",
    ()=>detectPlatform,
    "getDevice",
    ()=>getDevice,
    "getDeviceCommands",
    ()=>getDeviceCommands,
    "getDevices",
    ()=>getDevices,
    "platformEmoji",
    ()=>platformEmoji,
    "platformLabel",
    ()=>platformLabel,
    "registerDevice",
    ()=>registerDevice,
    "removeDevice",
    ()=>removeDevice,
    "sendDeviceCommand",
    ()=>sendDeviceCommand,
    "updateDeviceMetrics",
    ()=>updateDeviceMetrics,
    "updateDeviceStatus",
    ()=>updateDeviceStatus
]);
// ── Device Management Store ──────────────────────────────────────────────
// JSON-backed device registry at ~/.agdi/dashboard/devices.json
// Tracks registered devices across Windows, macOS, Linux, iOS, Android
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
;
const DATA_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].homedir(), ".agdi", "dashboard");
const DEVICES_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(DATA_DIR, "devices.json");
async function ensureDir() {
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].mkdir(DATA_DIR, {
        recursive: true
    });
}
async function loadDevices() {
    try {
        const raw = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(DEVICES_FILE, "utf-8");
        return JSON.parse(raw);
    } catch  {
        return [];
    }
}
async function saveDevices(devices) {
    await ensureDir();
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(DEVICES_FILE, JSON.stringify(devices, null, 2), "utf-8");
}
// ── Commands history ────────────────────────────────────────────────────
const COMMANDS_FILE = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(DATA_DIR, "device-commands.jsonl");
async function appendCommand(cmd) {
    await ensureDir();
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].appendFile(COMMANDS_FILE, JSON.stringify(cmd) + "\n", "utf-8");
}
async function loadCommands(deviceId) {
    try {
        const raw = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(COMMANDS_FILE, "utf-8");
        const all = raw.trim().split("\n").filter(Boolean).map((l)=>{
            try {
                return JSON.parse(l);
            } catch  {
                return null;
            }
        }).filter(Boolean);
        if (deviceId) return all.filter((c)=>c.deviceId === deviceId).slice(-100);
        return all.slice(-200);
    } catch  {
        return [];
    }
}
async function getDevices() {
    return loadDevices();
}
async function getDevice(id) {
    const devices = await loadDevices();
    return devices.find((d)=>d.id === id) || null;
}
async function registerDevice(info) {
    const devices = await loadDevices();
    const device = {
        ...info,
        id: __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID(),
        status: "online",
        lastSeen: Date.now(),
        registeredAt: Date.now()
    };
    devices.push(device);
    await saveDevices(devices);
    return device;
}
async function updateDeviceMetrics(id, metrics, status) {
    const devices = await loadDevices();
    const device = devices.find((d)=>d.id === id);
    if (!device) return false;
    device.metrics = metrics;
    device.lastSeen = Date.now();
    if (status) device.status = status;
    await saveDevices(devices);
    return true;
}
async function updateDeviceStatus(id, status) {
    const devices = await loadDevices();
    const device = devices.find((d)=>d.id === id);
    if (!device) return false;
    device.status = status;
    device.lastSeen = Date.now();
    await saveDevices(devices);
    return true;
}
async function removeDevice(id) {
    const devices = await loadDevices();
    const filtered = devices.filter((d)=>d.id !== id);
    if (filtered.length === devices.length) return false;
    await saveDevices(filtered);
    return true;
}
async function sendDeviceCommand(deviceId, type, payload = {}) {
    const cmd = {
        id: __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID(),
        deviceId,
        type,
        payload,
        status: "pending",
        createdAt: Date.now()
    };
    await appendCommand(cmd);
    return cmd;
}
async function getDeviceCommands(deviceId) {
    return loadCommands(deviceId);
}
function detectPlatform(userAgent) {
    const ua = userAgent.toLowerCase();
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
    if (ua.includes("android")) return "android";
    if (ua.includes("macintosh") || ua.includes("mac os")) return "macos";
    if (ua.includes("linux")) return "linux";
    return "windows";
}
function platformLabel(p) {
    const labels = {
        windows: "Windows",
        macos: "macOS",
        linux: "Linux",
        ios: "iOS",
        android: "Android"
    };
    return labels[p];
}
function platformEmoji(p) {
    const emojis = {
        windows: "🪟",
        macos: "🍎",
        linux: "🐧",
        ios: "📱",
        android: "🤖"
    };
    return emojis[p];
}
}),
"[project]/Documents/GitHub/Agdi/apps/dashboard/src/app/api/devices/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "PATCH",
    ()=>PATCH,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/Agdi/apps/dashboard/src/lib/devices.ts [app-route] (ecmascript)");
;
;
async function GET(request) {
    const id = request.nextUrl.searchParams.get("id");
    const commands = request.nextUrl.searchParams.get("commands");
    const deviceId = request.nextUrl.searchParams.get("deviceId");
    if (commands) {
        const cmds = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDeviceCommands"])(deviceId || undefined);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            commands: cmds
        });
    }
    if (id) {
        const device = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDevice"])(id);
        if (!device) return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Device not found"
        }, {
            status: 404
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            device
        });
    }
    const devices = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDevices"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        devices
    });
}
async function POST(request) {
    try {
        const body = await request.json();
        // Send command to device
        if (body.action === "command") {
            const { deviceId, type, payload } = body;
            if (!deviceId || !type) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "deviceId and type required"
                }, {
                    status: 400
                });
            }
            const cmd = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sendDeviceCommand"])(deviceId, type, payload || {});
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                command: cmd
            });
        }
        // Register new device
        const { name, platform, hostname, ip, agentVersion, osVersion, metrics, capabilities, tags } = body;
        if (!name || !platform) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "name and platform required"
            }, {
                status: 400
            });
        }
        const device = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerDevice"])({
            name,
            platform: platform,
            hostname: hostname || "unknown",
            ip: ip || request.headers.get("x-forwarded-for") || "unknown",
            agentVersion: agentVersion || "unknown",
            osVersion: osVersion || "unknown",
            metrics: metrics || {
                cpuUsage: 0,
                memoryUsed: 0,
                memoryTotal: 0,
                diskUsed: 0,
                diskTotal: 0,
                batteryLevel: -1,
                batteryCharging: false,
                uptime: 0,
                networkLatency: 0
            },
            capabilities: capabilities || [],
            tags: tags || []
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            device
        }, {
            status: 201
        });
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid request"
        }, {
            status: 400
        });
    }
}
async function PATCH(request) {
    try {
        const { id, metrics, status } = await request.json();
        if (!id) return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "id required"
        }, {
            status: 400
        });
        if (metrics) {
            const ok = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateDeviceMetrics"])(id, metrics, status);
            if (!ok) return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Device not found"
            }, {
                status: 404
            });
        } else if (status) {
            const ok = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateDeviceStatus"])(id, status);
            if (!ok) return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Device not found"
            }, {
                status: 404
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        });
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Invalid request"
        }, {
            status: 400
        });
    }
}
async function DELETE(request) {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: "id required"
    }, {
        status: 400
    });
    const ok = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$src$2f$lib$2f$devices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["removeDevice"])(id);
    if (!ok) return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: "Device not found"
    }, {
        status: 404
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$Agdi$2f$apps$2f$dashboard$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        success: true
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__50cb9405._.js.map