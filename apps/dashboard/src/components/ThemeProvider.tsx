"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** The resolved theme (always "light" or "dark") */
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  resolved: "dark",
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "agdi-theme";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return getSystemPreference();
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored);
      setResolved(resolveTheme(stored));
    }
  }, []);

  // Apply to <html> element
  useEffect(() => {
    const html = document.documentElement;
    const r = resolveTheme(theme);
    setResolved(r);

    if (r === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [theme]);

  // Listen for system preference changes when mode is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? "dark" : "light");
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
