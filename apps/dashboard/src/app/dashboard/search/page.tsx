"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search, Bot, TerminalSquare, Globe, MessageSquare, Workflow,
  Brain, BookOpen, BarChart3, Shield, Settings, Monitor,
  Activity, Blocks, CheckSquare, Brush, FileText,
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  href: string;
  icon: React.ReactNode;
}

const allResults: SearchResult[] = [
  // Pages
  { id: "p1", title: "Dashboard Overview", description: "Main dashboard with agent metrics and activity feed", category: "Pages", href: "/dashboard", icon: <BarChart3 className="w-4 h-4 text-cyan-400" /> },
  { id: "p2", title: "Agent Management", description: "View, spawn, and manage AI agents", category: "Pages", href: "/dashboard/agents", icon: <Bot className="w-4 h-4 text-cyan-400" /> },
  { id: "p3", title: "Console Logs", description: "Real-time log viewer with level filtering", category: "Pages", href: "/dashboard/console", icon: <TerminalSquare className="w-4 h-4 text-green-400" /> },
  { id: "p4", title: "Browser Automation", description: "Headless browser control for agents", category: "Pages", href: "/dashboard/browser", icon: <Globe className="w-4 h-4 text-blue-400" /> },
  { id: "p5", title: "Visual Canvas", description: "Drag-and-drop pipeline builder", category: "Pages", href: "/dashboard/canvas", icon: <Brush className="w-4 h-4 text-purple-400" /> },
  { id: "p6", title: "Channels", description: "WhatsApp, Discord, Telegram, Slack, Signal, iMessage", category: "Pages", href: "/dashboard/channels", icon: <MessageSquare className="w-4 h-4 text-green-400" /> },
  { id: "p7", title: "Workflows", description: "n8n workflow automation management", category: "Pages", href: "/dashboard/workflows", icon: <Workflow className="w-4 h-4 text-purple-400" /> },
  { id: "p8", title: "Tool Nodes", description: "LLM, Web Search, Code Exec, File I/O, HTTP, Memory", category: "Pages", href: "/dashboard/nodes", icon: <Blocks className="w-4 h-4 text-amber-400" /> },
  { id: "p9", title: "Agent Skills", description: "Code generation, research, data analysis capabilities", category: "Pages", href: "/dashboard/skills", icon: <Brain className="w-4 h-4 text-pink-400" /> },
  { id: "p10", title: "Request Traces", description: "Trace requests with step-by-step timing", category: "Pages", href: "/dashboard/traces", icon: <Activity className="w-4 h-4 text-cyan-400" /> },
  { id: "p11", title: "Knowledge Base", description: "Upload and manage knowledge files", category: "Pages", href: "/dashboard/knowledge", icon: <BookOpen className="w-4 h-4 text-amber-400" /> },
  { id: "p12", title: "Usage Analytics", description: "Token usage, cost, and message trends", category: "Pages", href: "/dashboard/analytics", icon: <BarChart3 className="w-4 h-4 text-indigo-400" /> },
  { id: "p13", title: "Pending Approvals", description: "Review and approve agent actions", category: "Pages", href: "/dashboard/approvals", icon: <CheckSquare className="w-4 h-4 text-amber-400" /> },
  { id: "p14", title: "Device Control", description: "Manage Windows, macOS, Linux, iOS, Android devices", category: "Pages", href: "/dashboard/devices", icon: <Monitor className="w-4 h-4 text-pink-400" /> },
  { id: "p15", title: "Security Audit Log", description: "Login attempts, CSRF events, session tracking", category: "Pages", href: "/dashboard/security", icon: <Shield className="w-4 h-4 text-red-400" /> },
  { id: "p16", title: "System Health", description: "Service status, uptime, system resources", category: "Pages", href: "/dashboard/health", icon: <Activity className="w-4 h-4 text-green-400" /> },
  { id: "p17", title: "Settings", description: "User management and API key configuration", category: "Pages", href: "/dashboard/settings", icon: <Settings className="w-4 h-4 text-gray-400" /> },
  // Documentation
  { id: "d1", title: "Getting Started", description: "Quick start guide for Agdi dashboard", category: "Documentation", href: "#", icon: <FileText className="w-4 h-4 text-gray-400" /> },
  { id: "d2", title: "API Reference", description: "REST API documentation for integrations", category: "Documentation", href: "#", icon: <FileText className="w-4 h-4 text-gray-400" /> },
  { id: "d3", title: "Agent Configuration", description: "How to configure and customize agents", category: "Documentation", href: "#", icon: <FileText className="w-4 h-4 text-gray-400" /> },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const filtered = query.length > 0
    ? allResults.filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase()),
      )
    : allResults.slice(0, 8);

  const categories = [...new Set(filtered.map((r) => r.category))];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Search className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Search
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Find pages, agents, settings, and documentation</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input type="text" placeholder="Search everything..." value={query}
          onChange={(e) => setQuery(e.target.value)} autoFocus
          className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white text-base focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20" />
      </div>

      {query && <p className="text-xs text-gray-500">{filtered.length} results for "{query}"</p>}

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{cat}</h2>
            <div className="space-y-1">
              {filtered.filter((r) => r.category === cat).map((r) => (
                <Link key={r.id} href={r.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group">
                  <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">{r.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">{r.title}</p>
                    <p className="text-xs text-gray-500 truncate">{r.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
