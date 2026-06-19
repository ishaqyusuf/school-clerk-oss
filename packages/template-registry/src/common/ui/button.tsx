"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";
import { useRegistry } from "../../registry-context";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "text-white",
        secondary: "border bg-white",
        ghost: "bg-transparent",
      },
      size: {
        sm: "text-sm",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export type WebsiteButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, WebsiteButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    const { config, style: siteStyle } = useRegistry();

    const variantStyle =
      variant === "secondary"
        ? {
            borderColor: config.themeConfig.primaryColor,
            color: config.themeConfig.primaryColor,
          }
        : variant === "ghost"
          ? {
              color: config.themeConfig.primaryColor,
            }
          : {
              background: config.themeConfig.primaryColor,
              color: "#ffffff",
            };

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        style={{
          minHeight: siteStyle.button.height,
          padding: siteStyle.button.padding,
          borderRadius: siteStyle.button.radius,
          fontFamily: config.themeConfig.bodyFont,
          ...variantStyle,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Button.displayName = "WebsiteButton";
