"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  agents: "Agents",
  console: "Console",
  browser: "Browser",
  canvas: "Canvas",
  channels: "Channels",
  workflows: "Workflows",
  nodes: "Nodes",
  skills: "Skills",
  traces: "Traces",
  knowledge: "Knowledge",
  analytics: "Analytics",
  approvals: "Approvals",
  devices: "Devices",
  security: "Security",
  settings: "Settings",
  health: "System Health",
  users: "Users",
  keys: "API Keys",
  login: "Login",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const isLast = i === segments.length - 1;
    // Check if segment looks like an ID (UUID or short hex)
    const isId = /^[a-f0-9-]{6,}$/i.test(seg);
    const label = isId ? seg.slice(0, 8) + "…" : routeLabels[seg] || seg;
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-xs mb-4" aria-label="Breadcrumb">
      <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors p-1">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.slice(1).map((crumb) => (
        <React.Fragment key={crumb.href}>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          {crumb.isLast ? (
            <span className="text-gray-300 font-medium px-1">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-gray-500 hover:text-white transition-colors px-1">
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
