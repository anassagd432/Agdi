"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Zap, Eye, EyeOff, Loader2, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          ...(username ? { username } : {}),
        }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid credentials. Please try again.");
      }
    } catch {
      setError("Connection error. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050b18] flex items-center justify-center relative overflow-hidden">

      {/* Ambient Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />

      {/* Login Card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]">

          {/* Logo / Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
              <Zap className="w-8 h-8 text-white" fill="white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Agdi Command</h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to your dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password..."
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
              ) : (
                <><Lock className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-xs text-gray-600 mt-6">
            Default: <code className="text-gray-500">admin</code> / your{" "}
            <code className="text-gray-500">AGDI_GATEWAY_TOKEN</code>
          </p>
        </div>
      </div>
    </div>
  );
}
