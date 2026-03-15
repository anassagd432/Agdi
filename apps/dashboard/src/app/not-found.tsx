"use client";

import React from "react";
import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500">
        {/* Glowing 404 */}
        <div className="relative">
          <h1 className="text-[120px] sm:text-[160px] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400/20 to-transparent leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-4xl sm:text-5xl font-black text-white">404</h2>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Page not found</h3>
          <p className="text-sm text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard"
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl text-sm flex items-center gap-2 hover:from-cyan-400 hover:to-blue-500">
            <Home className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/dashboard/search"
            className="px-5 py-2.5 border border-white/10 text-gray-400 font-semibold rounded-xl text-sm flex items-center gap-2 hover:text-white hover:bg-white/5">
            <Search className="w-4 h-4" /> Search
          </Link>
        </div>

        {/* Decorative gradient */}
        <div className="pt-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <p className="text-[10px] text-gray-600 mt-4">
            Agdi Dashboard · <button onClick={() => history.back()} className="text-cyan-500/60 hover:text-cyan-400">Go back</button>
          </p>
        </div>
      </div>
    </div>
  );
}
