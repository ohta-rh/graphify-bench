/**
 * Root layout: html/body, font variables and `globals.css`. Exports `metadata`.
 *
 * Owner D. Deliberately free of session and tenant concerns — everything that
 * needs an `Actor` lives under `(dashboard)`, so this layout stays static and
 * the marketing tree can be prerendered.
 */

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Taskflow",
    template: "%s · Taskflow",
  },
  description: "Multi-tenant project and issue tracking for small teams.",
  applicationName: "Taskflow",
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {props.children}
      </body>
    </html>
  );
}
