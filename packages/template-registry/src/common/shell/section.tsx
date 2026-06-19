"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../cn";
import { useRegistry } from "../../registry-context";

export type SectionProps = HTMLAttributes<HTMLElement> & {
  width?: "default" | "narrow" | "wide" | "full";
};

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ children, className, style, width = "default", ...props }, ref) => {
    const { config, style: siteStyle } = useRegistry();
    const maxWidth =
      width === "full"
        ? "none"
        : width === "wide"
          ? "82rem"
          : width === "narrow"
            ? "56rem"
            : siteStyle.section.maxWidth;

    return (
      <section
        ref={ref}
        className={cn("w-full", className)}
        style={{
          padding: siteStyle.section.padding,
          background: config.themeConfig.surfaceColor,
          color: "#0f172a",
          ...style,
        }}
        {...props}
      >
        <div
          style={{
            width: "100%",
            maxWidth,
            margin: "0 auto",
          }}
        >
          {children}
        </div>
      </section>
    );
  }
);

Section.displayName = "WebsiteSection";
