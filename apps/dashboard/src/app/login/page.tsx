"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        localStorage.setItem("agdi-username", username);
        toast.success("Welcome back!");
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid credentials.");
      }
    } catch {
      setError("Connection failed. Is the server running?");
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

      <div className="relative w-full max-w-sm space-y-8 animate-in fade-in duration-500">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Agdi Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="admin" autoFocus autoComplete="username"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                         focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20
                         placeholder:text-gray-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                           focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20
                           placeholder:text-gray-600 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl
                       flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500
                       disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/10">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Hint */}
        <div className="text-center">
          <p className="text-[10px] text-gray-600">
            Default credentials: <code className="text-gray-500">admin</code> / <code className="text-gray-500">admin</code>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mb-4" />
          <p className="text-[10px] text-gray-600">
            Agdi v4.0.1 · Powered by AI
          </p>
        </div>
      </div>
    </div>
  );
}
