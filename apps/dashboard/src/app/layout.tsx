import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGDI Dashboard",
  description: "Personal AI Assistant Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
