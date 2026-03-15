"use client";

import React from "react";
import Link from "next/link";
import { Home, Search, ArrowLeft, FileQuestion } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 animate-in fade-in duration-500 space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-blue-600/10 border border-cyan-500/20 flex items-center justify-center">
        <FileQuestion className="w-10 h-10 text-cyan-400/50" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white">Page not found</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          This dashboard page doesn&apos;t exist. Use the sidebar or search to navigate.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard"
          className="px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg text-sm flex items-center gap-2 hover:bg-cyan-400">
          <Home className="w-4 h-4" /> Overview
        </Link>
        <Link href="/dashboard/search"
          className="px-4 py-2 border border-white/10 text-gray-400 font-semibold rounded-lg text-sm flex items-center gap-2 hover:text-white">
          <Search className="w-4 h-4" /> Search
        </Link>
      </div>
    </div>
  );
}
