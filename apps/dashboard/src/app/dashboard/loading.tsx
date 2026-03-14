export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse" />
        </div>
        <div className="h-9 w-9 bg-white/5 rounded-lg animate-pulse" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel p-5 rounded-xl border border-white/5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <div className="h-10 bg-black/40 border-b border-white/5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b border-white/5"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-white/5 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
