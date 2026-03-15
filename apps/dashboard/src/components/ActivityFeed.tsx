"use client";

import React, { useState, useEffect } from "react";
import {
  Bot, MessageSquare, Shield, Zap, Download, Globe, Terminal, Bell,
  Workflow, FileUp, Key, User, Cpu,
} from "lucide-react";

interface ActivityEvent {
  id: string;
  type: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  detail: string;
  ts: number;
}

const eventTemplates = [
  { type: "agent_message", icon: <Bot className="w-3.5 h-3.5" />, color: "text-cyan-400", title: "Agent replied", details: ["Coder sent a response", "Researcher completed analysis", "Writer drafted content"] },
  { type: "channel_msg", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-green-400", title: "Channel message", details: ["WhatsApp message received", "Discord command processed", "Telegram update"] },
  { type: "auth", icon: <Shield className="w-3.5 h-3.5" />, color: "text-amber-400", title: "Auth event", details: ["User logged in", "API key used", "Session refreshed"] },
  { type: "tool_exec", icon: <Zap className="w-3.5 h-3.5" />, color: "text-purple-400", title: "Tool executed", details: ["Code interpreter ran", "Web search completed", "File written"] },
  { type: "workflow", icon: <Workflow className="w-3.5 h-3.5" />, color: "text-blue-400", title: "Workflow", details: ["Pipeline triggered", "Automation completed", "Scheduled task ran"] },
  { type: "system", icon: <Cpu className="w-3.5 h-3.5" />, color: "text-gray-400", title: "System", details: ["Health check passed", "Memory optimized", "Cache cleared"] },
];

function generateEvent(): ActivityEvent {
  const tmpl = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
  const detail = tmpl.details[Math.floor(Math.random() * tmpl.details.length)];
  return {
    id: crypto.randomUUID(),
    type: tmpl.type,
    icon: tmpl.icon,
    color: tmpl.color,
    title: tmpl.title,
    detail,
    ts: Date.now(),
  };
}

export function ActivityFeed({ maxItems = 15 }: { maxItems?: number }) {
  const [events, setEvents] = useState<ActivityEvent[]>(() =>
    Array.from({ length: 5 }, () => ({ ...generateEvent(), ts: Date.now() - Math.random() * 300000 })),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((prev) => [generateEvent(), ...prev].slice(0, maxItems));
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [maxItems]);

  function timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  return (
    <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" /> Activity Feed
        </h3>
        <span className="text-[10px] text-gray-500">Live</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {events.map((e, i) => (
          <div key={e.id}
            className={`flex items-center gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${i === 0 ? "animate-in fade-in duration-300" : ""}`}>
            <span className={e.color}>{e.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-300">{e.detail}</span>
            </div>
            <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(e.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
