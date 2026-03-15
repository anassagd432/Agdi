"use client";

import React, { useState } from "react";
import {
  Plug, CheckCircle2, XCircle, ExternalLink, Settings,
  RefreshCw, Loader2, Zap,
} from "lucide-react";
import { toast } from "sonner";

interface Integration {
  id: string; name: string; description: string;
  icon: string; color: string; bg: string;
  connected: boolean; status: string;
  category: string; url?: string;
}

const integrations: Integration[] = [
  { id: "openai", name: "OpenAI", description: "GPT-5, GPT-4.1, o3, DALL-E 4", icon: "🤖", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", connected: true, status: "3 models active", category: "AI Providers" },
  { id: "anthropic", name: "Anthropic", description: "Claude 4 Opus, Claude 3.7 Sonnet", icon: "🧠", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", connected: true, status: "2 models active", category: "AI Providers" },
  { id: "google", name: "Google AI", description: "Gemini 2.5 Pro, Gemini 2.5 Flash", icon: "✨", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", connected: false, status: "Not configured", category: "AI Providers" },
  { id: "github", name: "GitHub", description: "Repository access, PR automation, issue tracking", icon: "🐙", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", connected: true, status: "Linked to agdi/agdi", category: "Developer Tools" },
  { id: "slack-int", name: "Slack", description: "Workspace notifications and bot integration", icon: "💬", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", connected: true, status: "4 channels", category: "Communication" },
  { id: "discord-int", name: "Discord", description: "Bot presence and event forwarding", icon: "🎮", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", connected: true, status: "2 servers", category: "Communication" },
  { id: "telegram-int", name: "Telegram", description: "Bot commands and message routing", icon: "📨", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", connected: false, status: "Not configured", category: "Communication" },
  { id: "vercel", name: "Vercel", description: "Deploy previews and serverless functions", icon: "▲", color: "text-white", bg: "bg-gray-500/10 border-gray-500/20", connected: false, status: "Not configured", category: "Infrastructure" },
  { id: "supabase", name: "Supabase", description: "Database, auth, and real-time subscriptions", icon: "⚡", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", connected: true, status: "2 tables synced", category: "Infrastructure" },
  { id: "n8n", name: "n8n", description: "Workflow automation and webhook triggers", icon: "🔄", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", connected: true, status: "5 workflows", category: "Automation" },
  { id: "zapier", name: "Zapier", description: "Connect to 6,000+ apps with Zaps", icon: "⚡", color: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/20", connected: false, status: "Not configured", category: "Automation" },
  { id: "s3", name: "AWS S3", description: "Cloud storage for files and backups", icon: "☁️", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", connected: false, status: "Not configured", category: "Infrastructure" },
];

export default function IntegrationsPage() {
  const [data, setData] = useState(integrations);
  const [category, setCategory] = useState("all");
  const [connecting, setConnecting] = useState<string | null>(null);

  const categories = ["all", ...new Set(data.map((i) => i.category))];
  const filtered = category === "all" ? data : data.filter((i) => i.category === category);

  const toggleConnection = (id: string) => {
    const item = data.find((i) => i.id === id);
    if (!item) return;
    if (item.connected) {
      if (!confirm(`Disconnect ${item.name}?`)) return;
      setData((prev) => prev.map((i) => i.id === id ? { ...i, connected: false, status: "Disconnected" } : i));
      toast.success(`${item.name} disconnected.`);
    } else {
      setConnecting(id);
      setTimeout(() => {
        setData((prev) => prev.map((i) => i.id === id ? { ...i, connected: true, status: "Connected" } : i));
        setConnecting(null);
        toast.success(`${item.name} connected!`);
      }, 1500);
    }
  };

  const connectedCount = data.filter((i) => i.connected).length;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Plug className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Integrations
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{connectedCount}/{data.length} connected</p>
      </div>

      <div className="flex rounded-lg border border-white/10 overflow-hidden w-fit">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-2 text-xs font-semibold capitalize ${category === c ? "bg-cyan-500/10 text-cyan-400" : "text-gray-500 hover:text-white"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-in">
        {filtered.map((item) => (
          <div key={item.id}
            className={`glass-panel p-5 border rounded-xl transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.04)] ${
              item.connected ? `${item.bg.split(" ")[1] || "border-white/5"}` : "border-white/5 opacity-70 hover:opacity-100"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                  <p className="text-[10px] text-gray-500">{item.category}</p>
                </div>
              </div>
              {item.connected
                ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                : <XCircle className="w-5 h-5 text-gray-600" />
              }
            </div>
            <p className="text-xs text-gray-400 mb-3">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold ${item.connected ? "text-green-400" : "text-gray-600"}`}>
                {item.status}
              </span>
              <button onClick={() => toggleConnection(item.id)} disabled={connecting === item.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  item.connected
                    ? "border border-red-500/20 text-red-400 hover:bg-red-500/10"
                    : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                } disabled:opacity-50`}>
                {connecting === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                  item.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
