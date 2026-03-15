"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCircle2, AlertTriangle, Info, XCircle, Trash2 } from "lucide-react";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  ts: number;
  read: boolean;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  success: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400", bg: "bg-green-500/10" },
  error:   { icon: <XCircle className="w-4 h-4" />,      color: "text-red-400",   bg: "bg-red-500/10" },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/10" },
  info:    { icon: <Info className="w-4 h-4" />,          color: "text-cyan-400",  bg: "bg-cyan-500/10" },
};

const STORAGE_KEY = "agdi-notifications";

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveNotifications(n: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(n.slice(0, 50)));
}

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications(loadNotifications());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type: string; title: string; message: string };
      const n: Notification = {
        id: crypto.randomUUID(),
        type: detail.type as Notification["type"],
        title: detail.title,
        message: detail.message,
        ts: Date.now(),
        read: false,
      };
      setNotifications((prev) => {
        const next = [n, ...prev].slice(0, 50);
        saveNotifications(next);
        return next;
      });
    };
    window.addEventListener("agdi-notification", handler);
    return () => window.removeEventListener("agdi-notification", handler);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, clearAll };
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0c1929] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button onClick={clearAll} className="p-1 text-gray-500 hover:text-red-400" title="Clear all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-gray-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-500">No notifications</div>
            )}
            {notifications.slice(0, 20).map((n) => {
              const tc = typeConfig[n.type] || typeConfig.info;
              return (
                <div key={n.id} className={`px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] ${!n.read ? "bg-white/[0.03]" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${tc.color}`}>{tc.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        {new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
