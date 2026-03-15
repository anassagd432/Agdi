"use client";

import React, { useState } from "react";
import {
  Play, Copy, Clock, ChevronDown, Loader2, Code,
  CheckCircle2, XCircle, Zap,
} from "lucide-react";
import { toast } from "sonner";

/* ── Endpoint definitions ─────────────────────────────────────────── */

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  body?: string;
}

const endpoints: Endpoint[] = [
  { method: "GET", path: "/api/agents", description: "List all agents" },
  { method: "POST", path: "/api/agents", description: "Spawn a new agent", body: '{\n  "name": "coder",\n  "model": "claude-3.5-sonnet",\n  "systemPrompt": "You are a code assistant."\n}' },
  { method: "GET", path: "/api/devices", description: "List all devices" },
  { method: "POST", path: "/api/devices", description: "Register a device", body: '{\n  "action": "register",\n  "name": "My Laptop",\n  "platform": "windows"\n}' },
  { method: "GET", path: "/api/users", description: "List all users" },
  { method: "POST", path: "/api/users", description: "Create a new user", body: '{\n  "username": "newuser",\n  "password": "securepass123",\n  "role": "viewer"\n}' },
  { method: "GET", path: "/api/keys", description: "List API keys" },
  { method: "POST", path: "/api/keys", description: "Create API key", body: '{\n  "name": "ci-deploy",\n  "permissions": ["read", "write"]\n}' },
  { method: "GET", path: "/api/health", description: "Gateway health check" },
  { method: "PATCH", path: "/api/devices", description: "Update device metrics", body: '{\n  "action": "update",\n  "id": "device-id",\n  "metrics": { "cpu": 45, "memory": 67 }\n}' },
  { method: "DELETE", path: "/api/devices", description: "Remove a device", body: '{\n  "action": "remove",\n  "id": "device-id"\n}' },
];

const methodColors: Record<string, { bg: string; text: string }> = {
  GET:    { bg: "bg-green-500/10 border-green-500/20", text: "text-green-400" },
  POST:   { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
  PATCH:  { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
  DELETE: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400" },
};

/* ── Page ─────────────────────────────────────────────────────────── */

export default function PlaygroundPage() {
  const [selected, setSelected] = useState<Endpoint>(endpoints[0]);
  const [body, setBody] = useState(endpoints[0].body || "");
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const selectEndpoint = (ep: Endpoint) => {
    setSelected(ep);
    setBody(ep.body || "");
    setResponse(null);
    setStatus(null);
    setDuration(null);
  };

  const execute = async () => {
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    try {
      const opts: RequestInit = { method: selected.method, headers: { "Content-Type": "application/json" } };
      if (selected.body && ["POST", "PATCH", "DELETE"].includes(selected.method)) {
        opts.body = body;
      }
      const res = await fetch(selected.path, opts);
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      setStatus(res.status);
      const text = await res.text();
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)); }
      catch { setResponse(text); }
    } catch (err) {
      setDuration(Math.round(performance.now() - start));
      setStatus(0);
      setResponse(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const mc = methodColors[selected.method];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Code className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> API Playground
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{endpoints.length} endpoints available</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-0">
        {/* Endpoint List */}
        <div className="glass-panel rounded-xl border border-white/5 overflow-y-auto">
          <div className="p-3 border-b border-white/10 bg-black/40">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Endpoints</h3>
          </div>
          <div className="p-2 space-y-1">
            {endpoints.map((ep, i) => {
              const emc = methodColors[ep.method];
              const active = selected === ep;
              return (
                <button key={i} onClick={() => selectEndpoint(ep)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
                    active ? "bg-white/5 border border-white/10" : "hover:bg-white/[0.02] border border-transparent"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`${emc.text} font-bold font-mono text-[10px] w-12`}>{ep.method}</span>
                    <span className="text-gray-300 font-mono truncate">{ep.path}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 ml-14">{ep.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Request/Response */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Request */}
          <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${mc.bg} ${mc.text}`}>
                  {selected.method}
                </span>
                <span className="text-sm font-mono text-white">{selected.path}</span>
              </div>
              <button onClick={execute} disabled={loading}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
            {selected.body && (
              <div className="p-0">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6}
                  className="w-full bg-transparent p-4 text-xs font-mono text-gray-300 focus:outline-none resize-none"
                  spellCheck={false} />
              </div>
            )}
          </div>

          {/* Response */}
          <div className="flex-1 glass-panel rounded-xl border border-white/5 overflow-hidden flex flex-col min-h-[200px]">
            <div className="px-4 py-2.5 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-400">Response</span>
                {status !== null && (
                  <span className={`flex items-center gap-1 text-xs font-bold ${
                    status >= 200 && status < 300 ? "text-green-400" : "text-red-400"}`}>
                    {status >= 200 && status < 300 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {status}
                  </span>
                )}
                {duration !== null && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Clock className="w-3 h-3" /> {duration}ms
                  </span>
                )}
              </div>
              {response && (
                <button onClick={() => { navigator.clipboard.writeText(response); toast.success("Copied!"); }}
                  className="p-1 text-gray-500 hover:text-white">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loading && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> Sending request...
                </div>
              )}
              {!loading && !response && (
                <p className="text-sm text-gray-600">Send a request to see the response.</p>
              )}
              {response && (
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{response}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
