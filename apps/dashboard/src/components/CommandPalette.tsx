"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, type AppRouterInstance } from "next/navigation";
import {
  Search, LayoutDashboard, Bot, TerminalSquare, Globe, Brush, MessageSquare,
  Workflow, Blocks, Brain, Activity, BookOpen, BarChart3, Shield, Settings,
  LogOut, Sun, Moon, Monitor, CheckSquare,
} from "lucide-react";

export interface CommandItem {
  id: string; label: string; icon: React.ReactNode;
  category: "navigation" | "action" | "theme";
  keywords: string[]; action: () => void;
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return { open, setOpen, onClose: () => setOpen(false) };
}

export function useCommandItems(router: AppRouterInstance, setTheme: (t: string) => void): CommandItem[] {
  return useMemo(() => {
    const nav = (path: string) => () => router.push(path);
    return [
      { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, category: "navigation" as const, keywords: ["home", "dashboard"], action: nav("/dashboard") },
      { id: "agents", label: "Agents", icon: <Bot className="w-4 h-4" />, category: "navigation" as const, keywords: ["ai", "bot", "fleet"], action: nav("/dashboard/agents") },
      { id: "console", label: "Console Log", icon: <TerminalSquare className="w-4 h-4" />, category: "navigation" as const, keywords: ["terminal", "log"], action: nav("/dashboard/console") },
      { id: "browser", label: "Browser", icon: <Globe className="w-4 h-4" />, category: "navigation" as const, keywords: ["web"], action: nav("/dashboard/browser") },
      { id: "canvas", label: "Canvas", icon: <Brush className="w-4 h-4" />, category: "navigation" as const, keywords: ["draw", "design"], action: nav("/dashboard/canvas") },
      { id: "channels", label: "Channels", icon: <MessageSquare className="w-4 h-4" />, category: "navigation" as const, keywords: ["whatsapp", "discord", "telegram"], action: nav("/dashboard/channels") },
      { id: "workflows", label: "Workflows", icon: <Workflow className="w-4 h-4" />, category: "navigation" as const, keywords: ["n8n", "automation"], action: nav("/dashboard/workflows") },
      { id: "nodes", label: "Nodes", icon: <Blocks className="w-4 h-4" />, category: "navigation" as const, keywords: ["tools"], action: nav("/dashboard/nodes") },
      { id: "skills", label: "Skills", icon: <Brain className="w-4 h-4" />, category: "navigation" as const, keywords: ["ability"], action: nav("/dashboard/skills") },
      { id: "traces", label: "Traces", icon: <Activity className="w-4 h-4" />, category: "navigation" as const, keywords: ["debug", "latency"], action: nav("/dashboard/traces") },
      { id: "knowledge", label: "Knowledge", icon: <BookOpen className="w-4 h-4" />, category: "navigation" as const, keywords: ["rag", "files"], action: nav("/dashboard/knowledge") },
      { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" />, category: "navigation" as const, keywords: ["usage", "cost", "tokens"], action: nav("/dashboard/analytics") },
      { id: "approvals", label: "Approvals", icon: <CheckSquare className="w-4 h-4" />, category: "navigation" as const, keywords: ["review"], action: nav("/dashboard/approvals") },
      { id: "security", label: "Security", icon: <Shield className="w-4 h-4" />, category: "navigation" as const, keywords: ["audit", "log"], action: nav("/dashboard/security") },
      { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" />, category: "navigation" as const, keywords: ["config", "preferences"], action: nav("/dashboard/settings") },
      { id: "signout", label: "Sign Out", icon: <LogOut className="w-4 h-4" />, category: "action" as const, keywords: ["logout", "exit"], action: () => { document.cookie = "agdi-token=; path=/; max-age=0"; router.push("/login"); } },
      { id: "theme-dark", label: "Dark Mode", icon: <Moon className="w-4 h-4" />, category: "theme" as const, keywords: ["night"], action: () => setTheme("dark") },
      { id: "theme-light", label: "Light Mode", icon: <Sun className="w-4 h-4" />, category: "theme" as const, keywords: ["day", "bright"], action: () => setTheme("light") },
      { id: "theme-system", label: "System Theme", icon: <Monitor className="w-4 h-4" />, category: "theme" as const, keywords: ["auto", "os"], action: () => setTheme("system") },
    ];
  }, [router, setTheme]);
}

interface PaletteProps { open: boolean; onClose: () => void; items: CommandItem[]; }

export function CommandPalette({ open, onClose, items }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQuery(""); setActiveIndex(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q)));
  }, [query, items]);

  const grouped = useMemo(() => {
    const g: Record<string, CommandItem[]> = {};
    for (const i of filtered) { (g[i.category] ??= []).push(i); }
    return g;
  }, [filtered]);

  const flatItems = useMemo(() => filtered, [filtered]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && flatItems[activeIndex]) { flatItems[activeIndex].action(); onClose(); }
    else if (e.key === "Escape") onClose();
  }, [flatItems, activeIndex, onClose]);

  if (!open) return null;

  const categoryLabels: Record<string, string> = { navigation: "Navigation", action: "Actions", theme: "Theme" };

  let itemIdx = 0;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-[#0c1929] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400" />
          <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown} placeholder="Type a command..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500" />
          <kbd className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">esc</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-2">
          {flatItems.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-500">No results</div>}
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{categoryLabels[cat] || cat}</div>
              {catItems.map((item) => {
                const idx = itemIdx++;
                return (
                  <button key={item.id} onClick={() => { item.action(); onClose(); }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${idx === activeIndex ? "bg-cyan-500/10 text-cyan-400" : "text-gray-300 hover:bg-white/5"}`}>
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
