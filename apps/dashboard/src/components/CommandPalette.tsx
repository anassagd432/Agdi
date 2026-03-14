"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Bot,
  TerminalSquare,
  Globe,
  Palette,
  MessageSquare,
  Network,
  Smartphone,
  Blocks,
  Activity,
  Database,
  BarChart,
  ShieldCheck,
  GitMerge,
  Shield,
  Settings,
  Moon,
  Sun,
  LogOut,
  Command,
} from "lucide-react";

// ── Command definitions ───────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: "navigation" | "action" | "theme";
  keywords: string[];
  action: () => void;
}

type ThemeSetter = (theme: "light" | "dark" | "system") => void;

export function useCommandItems(
  router: ReturnType<typeof useRouter>,
  setTheme?: ThemeSetter,
): CommandItem[] {
  return useMemo(() => {
    const nav: CommandItem[] = [
      { id: "overview", label: "Go to Overview", icon: <LayoutDashboard className="w-4 h-4" />, category: "navigation", keywords: ["home", "dashboard", "overview"], action: () => router.push("/dashboard") },
      { id: "agents", label: "Go to Agents", icon: <Bot className="w-4 h-4" />, category: "navigation", keywords: ["agents", "fleet", "bots"], action: () => router.push("/dashboard/agents") },
      { id: "console", label: "Go to Console", icon: <TerminalSquare className="w-4 h-4" />, category: "navigation", keywords: ["console", "log", "terminal"], action: () => router.push("/dashboard/console") },
      { id: "browser", label: "Go to Browser", icon: <Globe className="w-4 h-4" />, category: "navigation", keywords: ["browser", "web"], action: () => router.push("/dashboard/browser") },
      { id: "canvas", label: "Go to Canvas", icon: <Palette className="w-4 h-4" />, category: "navigation", keywords: ["canvas", "draw", "design"], action: () => router.push("/dashboard/canvas") },
      { id: "channels", label: "Go to Channels", icon: <MessageSquare className="w-4 h-4" />, category: "navigation", keywords: ["channels", "messaging"], action: () => router.push("/dashboard/channels") },
      { id: "automations", label: "Go to Automations", icon: <Network className="w-4 h-4" />, category: "navigation", keywords: ["automations", "n8n"], action: () => router.push("/dashboard/automations") },
      { id: "nodes", label: "Go to Nodes", icon: <Smartphone className="w-4 h-4" />, category: "navigation", keywords: ["nodes", "devices"], action: () => router.push("/dashboard/nodes") },
      { id: "skills", label: "Go to Skills", icon: <Blocks className="w-4 h-4" />, category: "navigation", keywords: ["skills", "plugins"], action: () => router.push("/dashboard/skills") },
      { id: "traces", label: "Go to Traces", icon: <Activity className="w-4 h-4" />, category: "navigation", keywords: ["traces", "execution", "logs"], action: () => router.push("/dashboard/traces") },
      { id: "knowledge", label: "Go to Knowledge", icon: <Database className="w-4 h-4" />, category: "navigation", keywords: ["knowledge", "memory", "rag"], action: () => router.push("/dashboard/knowledge") },
      { id: "analytics", label: "Go to Analytics", icon: <BarChart className="w-4 h-4" />, category: "navigation", keywords: ["analytics", "cost", "tokens", "usage"], action: () => router.push("/dashboard/analytics") },
      { id: "approvals", label: "Go to Approvals", icon: <ShieldCheck className="w-4 h-4" />, category: "navigation", keywords: ["approvals", "pending"], action: () => router.push("/dashboard/approvals") },
      { id: "workflows", label: "Go to Workflows", icon: <GitMerge className="w-4 h-4" />, category: "navigation", keywords: ["workflows", "n8n", "pipelines"], action: () => router.push("/dashboard/workflows") },
      { id: "security", label: "Go to Security", icon: <Shield className="w-4 h-4" />, category: "navigation", keywords: ["security", "audit", "login"], action: () => router.push("/dashboard/security") },
      { id: "settings", label: "Go to Settings", icon: <Settings className="w-4 h-4" />, category: "navigation", keywords: ["settings", "config", "preferences"], action: () => router.push("/dashboard/settings") },
    ];

    const actions: CommandItem[] = [
      { id: "logout", label: "Sign Out", icon: <LogOut className="w-4 h-4" />, category: "action", keywords: ["logout", "sign out", "exit"], action: () => { fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login")); } },
    ];

    const themeItems: CommandItem[] = setTheme
      ? [
          { id: "theme-dark", label: "Switch to Dark Mode", icon: <Moon className="w-4 h-4" />, category: "theme", keywords: ["dark", "theme", "night"], action: () => setTheme("dark") },
          { id: "theme-light", label: "Switch to Light Mode", icon: <Sun className="w-4 h-4" />, category: "theme", keywords: ["light", "theme", "day"], action: () => setTheme("light") },
          { id: "theme-system", label: "Use System Theme", icon: <Settings className="w-4 h-4" />, category: "theme", keywords: ["system", "auto", "theme"], action: () => setTheme("system") },
        ]
      : [];

    return [...nav, ...actions, ...themeItems];
  }, [router, setTheme]);
}

// ── Fuzzy match ───────────────────────────────────────────────────────────

function fuzzyMatch(query: string, item: CommandItem): boolean {
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  return item.keywords.some((kw) => kw.includes(q));
}

// ── Component ─────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (query ? items.filter((item) => fuzzyMatch(query, item)) : items),
    [query, items],
  );

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const runAction = useCallback(
    (item: CommandItem) => {
      onClose();
      // Small delay so the palette closes first
      setTimeout(() => item.action(), 80);
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[activeIndex]) runAction(filtered[activeIndex]);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, activeIndex, runAction, onClose],
  );

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const categories = [
    { key: "navigation", label: "Navigation" },
    { key: "action", label: "Actions" },
    { key: "theme", label: "Theme" },
  ];

  // Build grouped display
  let globalIdx = -1;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[#0a1628] border border-white/10 rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
          />
          <kbd className="text-[10px] text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No commands found for &ldquo;{query}&rdquo;
            </div>
          )}

          {categories.map(({ key, label }) => {
            const catItems = filtered.filter((i) => i.category === key);
            if (catItems.length === 0) return null;

            return (
              <div key={key}>
                <div className="px-4 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {label}
                </div>
                {catItems.map((item) => {
                  globalIdx++;
                  const idx = globalIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => runAction(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        activeIndex === idx
                          ? "bg-cyan-500/10 text-white"
                          : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={
                          activeIndex === idx
                            ? "text-cyan-400"
                            : "text-gray-500"
                        }
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {activeIndex === idx && (
                        <span className="text-[10px] text-gray-500">↵</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-600">
          <span>
            <kbd className="bg-white/5 border border-white/10 px-1 rounded font-mono">↑↓</kbd>{" "}
            navigate{" "}
            <kbd className="bg-white/5 border border-white/10 px-1 rounded font-mono ml-1">↵</kbd>{" "}
            select
          </span>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K to toggle
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Keyboard hook ─────────────────────────────────────────────────────────

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen, onClose: () => setOpen(false) };
}
