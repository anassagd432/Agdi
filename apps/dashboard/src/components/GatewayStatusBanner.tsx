"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw, X } from "lucide-react";
import { agdi } from "@/lib/agdi-client";

/**
 * Banner that appears when the Agdi Gateway WebSocket is disconnected.
 * Auto-hides when the connection is restored.
 */
export function GatewayStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const check = () => {
      const offline = agdi.status.status === "offline";
      setIsOffline(offline);
      if (!offline) {
        setDismissed(false); // Reset dismiss when reconnected
        setReconnecting(false);
      }
    };

    // Check immediately and every 2 seconds
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReconnect = () => {
    setReconnecting(true);
    // The client auto-reconnects, but we can trigger a page-level retry
    window.location.reload();
  };

  if (!isOffline || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-b border-red-500/20 backdrop-blur-sm animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30">
            <WifiOff className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-300">
              Gateway Disconnected
            </p>
            <p className="text-xs text-red-400/70">
              Unable to reach the Agdi Gateway. Data may be stale.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReconnect}
            disabled={reconnecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${reconnecting ? "animate-spin" : ""}`}
            />
            {reconnecting ? "Reconnecting..." : "Reconnect"}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-red-400/50 hover:text-red-300 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
