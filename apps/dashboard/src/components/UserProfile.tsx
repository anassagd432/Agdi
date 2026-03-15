"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, LogOut, Settings, Shield, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserProfileDropdown() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("admin");
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("agdi-username");
      if (stored) setUsername(stored);
    } catch { /* skip */ }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = username.slice(0, 2).toUpperCase();

  const signOut = () => {
    void cookieStore?.delete?.("agdi-token").catch(() => {});
    router.push("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center text-[11px] font-bold text-cyan-400">
          {initials}
        </div>
        <div className="flex-1 min-w-0 hidden lg:block">
          <p className="text-xs font-semibold text-white truncate">{username}</p>
          <p className="text-[10px] text-gray-500">Admin</p>
        </div>
        <ChevronUp className={`w-3.5 h-3.5 text-gray-500 transition-transform hidden lg:block ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0c1929] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{username}</p>
                <p className="text-[10px] text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            <button onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5">
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
            <button onClick={() => { setOpen(false); router.push("/dashboard/security"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5">
              <Shield className="w-3.5 h-3.5" /> Security Log
            </button>
            <div className="border-t border-white/5 my-1" />
            <button onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
