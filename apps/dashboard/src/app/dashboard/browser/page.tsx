"use client";
import { Globe, ExternalLink } from "lucide-react";

export default function BrowserPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Globe className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Browser
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Web browser control for agent automation</p>
      </div>
      <div className="flex-1 glass-panel border border-white/5 rounded-xl flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-blue-600/10 border border-cyan-500/20 flex items-center justify-center">
          <Globe className="w-10 h-10 text-cyan-400/60" />
        </div>
        <h2 className="text-lg font-semibold text-white">Browser Automation</h2>
        <p className="text-sm text-gray-400 text-center max-w-md">Control a headless browser for web scraping, testing, and agent-driven web interactions. Connect your gateway to enable.</p>
        <button className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-cyan-500/20">
          <ExternalLink className="w-4 h-4" /> Connect Browser
        </button>
      </div>
    </div>
  );
}
