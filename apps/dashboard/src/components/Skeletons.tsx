"use client";

import React from "react";

/* ── Skeleton primitives ──────────────────────────────────────────── */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

/* ── Page-level skeletons ─────────────────────────────────────────── */

export function CardSkeleton() {
  return (
    <div className="glass-panel p-5 border border-white/5 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 bg-black/40 flex gap-4">
        {Array.from({ length: cols }, (_, i) => <Skeleton key={i} className="h-3 w-20" />)}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="px-5 py-3 border-b border-white/5 flex gap-4">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className={`h-3 ${j === 0 ? "w-40" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="glass-panel p-5 border border-white/5 rounded-xl space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function AgentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => <AgentCardSkeleton key={i} />)}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {/* Incoming */}
      <div className="flex justify-start">
        <div className="max-w-[70%] space-y-1.5">
          <div className="flex items-center gap-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-10" /></div>
          <Skeleton className="h-16 w-64 rounded-xl" />
        </div>
      </div>
      {/* Outgoing */}
      <div className="flex justify-end">
        <div className="max-w-[70%] space-y-1.5">
          <div className="flex items-center gap-2 justify-end"><Skeleton className="h-3 w-8" /><Skeleton className="h-3 w-10" /></div>
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
      </div>
      {/* Incoming */}
      <div className="flex justify-start">
        <div className="max-w-[70%] space-y-1.5">
          <div className="flex items-center gap-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-10" /></div>
          <Skeleton className="h-24 w-72 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function DeviceCardSkeleton() {
  return (
    <div className="glass-panel p-5 border border-white/5 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    </div>
  );
}
