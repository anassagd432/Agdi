"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const themes: Array<{ value: "dark" | "light" | "system"; icon: React.ReactNode; label: string }> = [
    { value: "dark", icon: <Moon className="w-3.5 h-3.5" />, label: "Dark" },
    { value: "light", icon: <Sun className="w-3.5 h-3.5" />, label: "Light" },
    { value: "system", icon: <Monitor className="w-3.5 h-3.5" />, label: "System" },
  ];
  return (
    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-black/20 border border-white/5">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`p-1.5 rounded-md transition-all text-xs flex items-center gap-1 ${
            theme === t.value ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
