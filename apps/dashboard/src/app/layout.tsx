import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "Agdi — AI Agent Command Center",
    template: "%s | Agdi",
  },
  description: "Enterprise-grade dashboard for orchestrating autonomous AI agents. Manage models from OpenAI, Anthropic, Google, xAI, DeepSeek, Meta & Mistral. Real-time analytics, multi-channel messaging, workflow automation.",
  keywords: ["AI agents", "LLM dashboard", "Claude", "GPT-5", "Gemini", "autonomous agents", "Agdi"],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Agdi — AI Agent Command Center",
    description: "Orchestrate autonomous AI agents across 7 providers. Real-time analytics, multi-channel messaging, enterprise team management.",
    siteName: "Agdi",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Agdi",
  },
};

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AgdiProvider } from "@/components/AgdiProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <AgdiProvider>
            {children}
          </AgdiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
