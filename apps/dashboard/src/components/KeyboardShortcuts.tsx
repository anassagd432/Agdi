"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Keyboard, X } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ["⌘", "K"], description: "Open command palette", category: "Navigation" },
  { keys: ["⌘", "/"], description: "Toggle keyboard shortcuts", category: "Navigation" },
  { keys: ["⌘", "B"], description: "Toggle sidebar", category: "Navigation" },
  // Actions
  { keys: ["⌘", "N"], description: "New agent", category: "Actions" },
  { keys: ["⌘", "S"], description: "Save / Submit", category: "Actions" },
  { keys: ["Enter"], description: "Send message", category: "Actions" },
  { keys: ["Shift", "Enter"], description: "New line in chat", category: "Actions" },
  { keys: ["Esc"], description: "Close modal / Cancel", category: "Actions" },
  // Page navigation
  { keys: ["G", "then", "D"], description: "Go to Dashboard", category: "Go to" },
  { keys: ["G", "then", "A"], description: "Go to Agents", category: "Go to" },
  { keys: ["G", "then", "C"], description: "Go to Console", category: "Go to" },
  { keys: ["G", "then", "S"], description: "Go to Settings", category: "Go to" },
];

export function useShortcutsModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return { open, setOpen, onClose: () => setOpen(false) };
}

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const categories = [...new Set(shortcuts.map((s) => s.category))];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div ref={ref} className="w-full max-w-lg bg-[#0c1929] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-scale duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cyan-400" /> Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{cat}</h3>
              <div className="space-y-1">
                {shortcuts.filter((s) => s.category === cat).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-300">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        k === "then"
                          ? <span key={j} className="text-[10px] text-gray-600 mx-0.5">then</span>
                          : <kbd key={j} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] text-gray-300 font-mono min-w-[22px] text-center">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-white/10 bg-black/40">
          <p className="text-[10px] text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono mx-0.5">⌘ /</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}
