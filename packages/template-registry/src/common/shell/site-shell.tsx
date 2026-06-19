"use client";

import { type ReactNode } from "react";
import { useRegistry } from "../../registry-context";

export function SiteShell({ children }: { children: ReactNode }) {
  const { config, cssVarsStyle } = useRegistry();

  return (
    <main
      style={{
        ...cssVarsStyle,
        minHeight: "100vh",
        background: config.themeConfig.secondaryColor,
        color: "#0f172a",
        fontFamily: config.themeConfig.bodyFont,
      }}
    >
      {children}
    </main>
  );
}
