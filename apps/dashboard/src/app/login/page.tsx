"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username || "admin", password }),
      });
      if (res.ok) { router.push("/dashboard"); }
      else { const d = await res.json(); setError(d.error || "Login failed"); }
    } catch { setError("Connection failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-transparent to-blue-950/20" />
      <form onSubmit={handleLogin} className="relative w-full max-w-md mx-4 p-8 bg-[#0a1628]/80 border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.08)] backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Agdi Command</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your dashboard</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin"
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password..."
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
            <Lock className="w-4 h-4" /> {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">Default: <code className="text-gray-500">admin</code> / your <code className="text-gray-500">AGDI_GATEWAY_TOKEN</code></p>
      </form>
    </div>
  );
}
