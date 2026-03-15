"use client";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-6xl mx-auto space-y-6 p-2">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-white/[0.04] animate-pulse" />
        <div className="h-4 w-32 rounded-md bg-white/[0.03] animate-pulse" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-panel p-5 border border-white/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="h-3 w-10 rounded bg-white/[0.03] animate-pulse" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-white/[0.05] animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/[0.03] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="glass-panel border border-white/5 rounded-xl p-5 space-y-4">
        <div className="h-5 w-36 rounded-lg bg-white/[0.05] animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded bg-white/[0.04] animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
              <div className="h-3 rounded bg-white/[0.03] animate-pulse" style={{ width: `${40 + Math.random() * 20}%` }} />
            </div>
            <div className="h-6 w-16 rounded-lg bg-white/[0.03] animate-pulse shrink-0" />
          </div>
        ))}
      </div>

      {/* Secondary content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-panel border border-white/5 rounded-xl p-5 space-y-3">
            <div className="h-5 w-28 rounded-lg bg-white/[0.05] animate-pulse" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
