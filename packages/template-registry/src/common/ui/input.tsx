"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../cn";
import { useRegistry } from "../../registry-context";

export type WebsiteInputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, WebsiteInputProps>(
  ({ className, style, ...props }, ref) => {
    const { config, style: siteStyle } = useRegistry();

    return (
      <input
        ref={ref}
        className={cn(
          "w-full border bg-white text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{
          minHeight: siteStyle.input.height,
          padding: siteStyle.input.padding,
          borderRadius: siteStyle.input.radius,
          borderColor: "rgba(15, 23, 42, 0.16)",
          color: "#0f172a",
          fontFamily: config.themeConfig.bodyFont,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "WebsiteInput";
