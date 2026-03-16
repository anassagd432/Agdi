"use client";
import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useAgdi } from "@/components/AgdiProvider";

export function GatewayStatusBanner() {
  const { isConnected, isConnecting } = useAgdi();

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Connecting...
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
      isConnected
        ? "border-green-500/30 bg-green-500/10 text-green-400"
        : "border-red-500/30 bg-red-500/10 text-red-400"
    }`}>
      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {isConnected ? "Gateway Connected" : "Gateway Offline"}
    </div>
  );
}
