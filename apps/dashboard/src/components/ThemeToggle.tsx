"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";

const MODES = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
      {MODES.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-1.5 rounded-md transition-all duration-200 ${
            theme === value
              ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
              : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
          }`}
          title={label}
          aria-label={`Switch to ${label} theme`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
