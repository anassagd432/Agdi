"use client";
import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { agdi } from "@/lib/agdi-client";

export function GatewayStatusBanner() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const s = await agdi.getStatus();
      setConnected(s.connected);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  if (connected === null) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border ${
      connected
        ? "border-green-500/20 bg-green-500/10 text-green-400"
        : "border-red-500/20 bg-red-500/10 text-red-400"
    }`}>
      {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {connected ? "Gateway Connected" : "Gateway Offline"}
    </div>
  );
}
