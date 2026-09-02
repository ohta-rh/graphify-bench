/**
 * Root layout: html/body, font variables and `globals.css`. Exports `metadata`.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskflow",
  description: "Multi-tenant project and issue tracking for small teams.",
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
