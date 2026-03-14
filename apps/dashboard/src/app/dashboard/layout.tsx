"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot, TerminalSquare, Globe, Brush, MessageSquare, Workflow, Blocks,
  Brain, Activity, BookOpen, BarChart3, CheckSquare, Shield, Settings,
  LayoutDashboard, Menu, X, Zap,
} from "lucide-react";
import { Toaster } from "sonner";
import { GatewayStatusBanner } from "@/components/GatewayStatusBanner";
import { initNotifications } from "@/lib/notifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette, useCommandPalette, useCommandItems } from "@/components/CommandPalette";
import { useTheme } from "@/components/ThemeProvider";
import { OnboardingWizard, useOnboarding } from "@/components/OnboardingWizard";

const sidebarNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/console", label: "Console", icon: TerminalSquare },
  { href: "/dashboard/browser", label: "Browser", icon: Globe },
  { href: "/dashboard/canvas", label: "Canvas", icon: Brush },
  { href: "/dashboard/channels", label: "Channels", icon: MessageSquare },
  { href: "/dashboard/workflows", label: "Workflows", icon: Workflow },
  { href: "/dashboard/nodes", label: "Nodes", icon: Blocks },
  { href: "/dashboard/skills", label: "Skills", icon: Brain },
  { href: "/dashboard/traces", label: "Traces", icon: Activity },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/dashboard/security", label: "Security", icon: Shield },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setTheme } = useTheme();
  const cmdPalette = useCommandPalette();
  const cmdItems = useCommandItems(router, setTheme);
  const onboarding = useOnboarding();

  useEffect(() => { initNotifications(); }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CommandPalette open={cmdPalette.open} onClose={cmdPalette.onClose} items={cmdItems} />
      {onboarding.show && <OnboardingWizard onComplete={onboarding.complete} />}
      <Toaster theme="dark" position="top-right" richColors />

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:flex flex-col border-r border-border/40 glass-panel rounded-none">
        <div className="flex h-16 items-center border-b border-border/40 px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Agdi</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? "bg-cyan-500/10 text-cyan-400 font-medium" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/40 flex items-center justify-between">
          <GatewayStatusBanner />
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-background/80 backdrop-blur-lg border-b border-border/40 flex items-center justify-between px-4 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Agdi</span>
        </Link>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-background/95 backdrop-blur-xl pt-14">
          <nav className="p-4 space-y-1">
            {sidebarNavItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                  pathname === item.href ? "bg-cyan-500/10 text-cyan-400" : "text-gray-400"}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 pt-20 md:pt-8">
        {children}
      </main>
    </div>
  );
}
