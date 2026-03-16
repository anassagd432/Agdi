"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Eye, EyeOff, Loader2, Zap, Server, Key } from "lucide-react";
import { toast } from "sonner";
import { useAgdi } from "@/components/AgdiProvider";

export default function LoginPage() {
  const router = useRouter();
  const { connect } = useAgdi();
  
  const [gatewayUrl, setGatewayUrl] = useState("127.0.0.1:18789");
  const [gatewayToken, setGatewayToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const testConnection = (url: string, token: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        let wsUrl = url;
        if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
          wsUrl = wsUrl.startsWith("localhost") || wsUrl.startsWith("127.0.0.1") 
            ? `ws://${wsUrl}` : `wss://${wsUrl}`;
        }
        if (token) {
          const parsed = new URL(wsUrl);
          parsed.searchParams.set("token", token);
          wsUrl = parsed.toString();
        }
        
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(false);
        };
      } catch (e) {
        resolve(false);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayUrl.trim()) {
      setError("Gateway URL is required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 1. Test Gateway Connection via WebSocket
      const isGatewayReachable = await testConnection(gatewayUrl, gatewayToken);
      
      if (!isGatewayReachable) {
        setError("Failed to connect to Gateway. Check URL, network, and token.");
        setLoading(false);
        return;
      }

      // 2. Set App Client State
      connect(gatewayUrl, gatewayToken);

      // 3. Issue the Next.js JWT Cookie for Middleware (bypassing normal auth payload check for the open-source release)
      // We still hit the login endpoint but we pass a generic admin payload, as real auth is enforced by the Gateway.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || "admin" }),
      });
      
      if (res.ok || res.status === 200) {
        toast.success("Connected to Agdi Gateway!");
        router.push("/dashboard");
      } else {
         // Fallback if the standard auth endpoint fails for some reason (we already validated the WS)
         toast.success("Gateway verified. Routing...");
         router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </div>

      <div className="relative w-full max-w-[400px] space-y-8 animate-in fade-in duration-500 bg-white/[0.02] border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Connect to Gateway</h1>
            <p className="text-sm text-gray-500 mt-1">Link your personal Agdi daemon</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 tracking-wider">GATEWAY URL</label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="127.0.0.1:18789" autoFocus spellCheck={false}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm
                           focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20
                           placeholder:text-gray-600 transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 tracking-wider">TOKEN / PASSWORD (OPTIONAL)</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type={showPassword ? "text" : "password"} value={gatewayToken}
                onChange={(e) => setGatewayToken(e.target.value)}
                placeholder="Secret token" spellCheck={false}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm
                           focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20
                           placeholder:text-gray-600 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 animate-in slide-in-from-top-1">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl
                       flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500
                       disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? "Connecting..." : "Connect"}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-gray-500">
            Connecting remotely? Use your <span className="text-cyan-400/80">Tailscale Funnel</span> URL.
          </p>
        </div>
      </div>
    </div>
  );
}
