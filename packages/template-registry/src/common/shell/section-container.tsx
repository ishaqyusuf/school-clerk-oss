"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../cn";
import { useRegistry } from "../../registry-context";

export type SectionContainerProps = HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center";
};

export const SectionContainer = forwardRef<HTMLDivElement, SectionContainerProps>(
  ({ align = "start", className, style, ...props }, ref) => {
    const { style: siteStyle } = useRegistry();

    return (
      <div
        ref={ref}
        className={cn("flex flex-col", className)}
        style={{
          gap: siteStyle.section.gap,
          alignItems: align === "center" ? "center" : "stretch",
          textAlign: align === "center" ? "center" : "inherit",
          ...style,
        }}
        {...props}
      />
    );
  }
);

SectionContainer.displayName = "WebsiteSectionContainer";
