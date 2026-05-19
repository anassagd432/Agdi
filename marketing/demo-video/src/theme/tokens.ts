// Single source of truth for the Agdi demo video's brand fidelity.

export const colors = {
  bg: "#0e1015",
  bgAccent: "#13151b",
  bgElevated: "#191c24",
  bgHover: "#1f2330",
  card: "#161920",
  cardForeground: "#f0f0f2",
  popover: "#191c24",

  text: "#d4d4d8",
  textStrong: "#f4f4f5",
  muted: "#838387",
  mutedStrong: "#75757d",

  border: "#1e2028",
  borderStrong: "#2e3040",
  borderHover: "#3e4050",

  accent: "#1ee0ff",
  accentHover: "#5aebff",
  accentSubtle: "rgba(30, 224, 255, 0.10)",
  accentGlow: "rgba(30, 224, 255, 0.25)",
  accent2: "#14b8a6",

  ok: "#22c55e",
  okSubtle: "rgba(34, 197, 94, 0.08)",
  warn: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",

  gridLine: "rgba(255, 255, 255, 0.03)",
  cardHighlight: "rgba(255, 255, 255, 0.04)",
  chrome: "rgba(14, 16, 21, 0.96)",
} as const;

// WhatsApp color scheme for phone mockup scenes
export const whatsapp = {
  green: "#075E54",
  greenDark: "#128C7E",
  greenLight: "#25D366",
  chatBg: "#ECE5DD",
  bubbleSelf: "#DCF8C6",
  bubbleOther: "#FFFFFF",
  timestamp: "#667781",
} as const;

export const fonts = {
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.25)",
  md: "0 4px 16px rgba(0, 0, 0, 0.30)",
  lg: "0 12px 32px rgba(0, 0, 0, 0.40)",
  xl: "0 24px 48px rgba(0, 0, 0, 0.50)",
  glow: "0 0 24px rgba(30, 224, 255, 0.25)",
} as const;

// cubic-bezier(0.16, 1, 0.3, 1) - Agdi's primary easing curve.
export const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const easeInOut: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Layout grid from the workspace shell.
export const layout = {
  sidebarWidth: 258,
  topbarHeight: 52,
} as const;
