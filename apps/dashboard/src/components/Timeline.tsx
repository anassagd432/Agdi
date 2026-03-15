"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock, Zap, Bot, MessageSquare, Shield, Globe, FileText,
  ArrowRight, TrendingUp, BarChart3, Sparkles,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
  link?: string;
}

const timelineEvents: TimelineEvent[] = [
  { id: "1", time: "2 min ago", title: "Agent response sent", detail: "Coder agent completed code review for PR #247", icon: <Bot className="w-4 h-4" />, color: "text-cyan-400", link: "/dashboard/agents" },
  { id: "2", time: "8 min ago", title: "Channel message", detail: "New message received on Discord #general", icon: <MessageSquare className="w-4 h-4" />, color: "text-green-400", link: "/dashboard/channels" },
  { id: "3", time: "15 min ago", title: "Security event", detail: "API key used from new IP 10.0.0.45", icon: <Shield className="w-4 h-4" />, color: "text-amber-400", link: "/dashboard/security" },
  { id: "4", time: "32 min ago", title: "Workflow completed", detail: "Auto-deploy pipeline finished successfully", icon: <Zap className="w-4 h-4" />, color: "text-purple-400", link: "/dashboard/workflows" },
  { id: "5", time: "1 hr ago", title: "Knowledge updated", detail: "3 files uploaded to knowledge base", icon: <FileText className="w-4 h-4" />, color: "text-blue-400", link: "/dashboard/knowledge" },
  { id: "6", time: "2 hr ago", title: "Web research", detail: "Researcher agent browsed 12 pages", icon: <Globe className="w-4 h-4" />, color: "text-pink-400", link: "/dashboard/browser" },
  { id: "7", time: "3 hr ago", title: "Analytics report", detail: "Daily usage report generated", icon: <BarChart3 className="w-4 h-4" />, color: "text-indigo-400", link: "/dashboard/analytics" },
  { id: "8", time: "5 hr ago", title: "Agent spawned", detail: "New writer agent created from template", icon: <Sparkles className="w-4 h-4" />, color: "text-orange-400", link: "/dashboard/agents" },
];

export function Timeline() {
  return (
    <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-black/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Timeline
        </h3>
        <span className="text-[10px] text-gray-500">Recent events</span>
      </div>
      <div className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-0 bottom-0 w-px bg-white/5" />
          <div className="space-y-4">
            {timelineEvents.map((event) => (
              <div key={event.id} className="flex gap-3 group">
                <div className={`relative z-10 w-5 h-5 rounded-full bg-[#0a0e17] border border-white/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-white/20 ${event.color}`}>
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={event.color}>{event.icon}</span>
                    <span className="text-xs font-semibold text-white">{event.title}</span>
                    <span className="text-[10px] text-gray-600 ml-auto shrink-0">{event.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{event.detail}</p>
                  {event.link && (
                    <Link href={event.link}
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-500/70 hover:text-cyan-400 mt-1">
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
