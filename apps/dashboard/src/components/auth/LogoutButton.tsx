"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { agdi } from "@/lib/agdi-client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    // Close WebSocket before clearing session to prevent stale reconnection
    agdi.destroy();

    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title="Sign out"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 text-sm"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
