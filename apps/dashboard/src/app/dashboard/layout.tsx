"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Bot, 
  TerminalSquare, 
  Settings, 
  LayoutDashboard, 
  Menu, 
  X,
  LogOut,
  Globe,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";

const sidebarNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Agents",
    href: "/dashboard/agents",
    icon: Bot,
  },
  {
    title: "Console Log",
    href: "/dashboard/console",
    icon: TerminalSquare,
  },
  {
    title: "Browser",
    href: "/dashboard/browser",
    icon: Globe,
  },
  {
    title: "Canvas",
    href: "/dashboard/canvas",
    icon: Palette,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:flex flex-col border-r border-border/40 glass-panel rounded-none">
        <div className="flex h-16 items-center border-b border-border/40 px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent text-xl">
            AGDI Command
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-4 text-sm font-medium gap-2">
            {sidebarNavItems.map((item, index) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-muted-foreground hover:text-foreground",
                    isActive ? "bg-primary/20 text-cyan-400 font-semibold shadow-[inset_0_0_10px_rgba(34,211,238,0.1)] border border-cyan-500/20" : "hover:bg-card/50"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive && "text-cyan-400")} />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border/40">
           <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-muted-foreground hover:text-red-400 hover:bg-card/50">
             <LogOut className="h-4 w-4" />
             Exit Dashboard
           </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full relative">
        {/* Mobile Header */}
        <header className="md:hidden flex h-14 items-center justify-between border-b border-border/40 glass px-4 sticky top-0 z-50">
          <span className="font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AGDI</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
             {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: "auto" }}
               exit={{ opacity: 0, height: 0 }}
               className="md:hidden glass border-b border-border/40 px-4 py-4 absolute w-full z-40"
            >
              <nav className="grid gap-2">
                {sidebarNavItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
      
      {/* Global Toaster for Notifications */}
      <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
          className: 'glass border-white/10 text-white',
          style: {
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(12px)',
          }
        }} 
      />
    </div>
  );
}
