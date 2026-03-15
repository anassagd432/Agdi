"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Agdi Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060a13] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-sm text-gray-400">
            An unexpected error occurred. This has been logged automatically.
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-600 font-mono mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <a href="/dashboard"
            className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white transition-colors">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
