"use client";
import { Brush, Pencil } from "lucide-react";

export default function CanvasPage() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Brush className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" /> Canvas
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Visual workspace for agent collaboration</p>
      </div>
      <div className="flex-1 glass-panel border border-white/5 rounded-xl flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-400/10 to-pink-600/10 border border-purple-500/20 flex items-center justify-center">
          <Pencil className="w-10 h-10 text-purple-400/60" />
        </div>
        <h2 className="text-lg font-semibold text-white">Visual Canvas</h2>
        <p className="text-sm text-gray-400 text-center max-w-md">Drag-and-drop canvas for building agent pipelines, visualizing data flows, and collaborative whiteboarding.</p>
        <button className="px-5 py-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-sm font-semibold hover:bg-purple-500/20">
          Open Canvas
        </button>
      </div>
    </div>
  );
}
