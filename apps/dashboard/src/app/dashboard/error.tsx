"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-6">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Page Error</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          This page encountered an error. Your other pages are unaffected.
        </p>
      </div>
      <button onClick={reset}
        className="px-5 py-2.5 rounded-lg bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-colors flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Reload Page
      </button>
    </div>
  );
}
