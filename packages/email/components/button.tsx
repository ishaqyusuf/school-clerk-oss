import { Button as ReactEmailButton } from "@react-email/components";
import type React from "react";
import { getEmailInlineStyles, getEmailThemeClasses } from "./theme";

type ButtonProps = {
	children: React.ReactNode;
	className?: string;
	href: string;
	variant?: "primary" | "secondary";
};

export function Button({
	children,
	className = "",
	href,
	variant = "primary",
}: ButtonProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	const baseClasses =
		"bg-transparent text-[14px] font-medium no-underline text-center px-6 py-3 border border-solid rounded-[10px]";
	const variantClasses =
		variant === "primary"
			? themeClasses.button
			: "border-[#d1d5db] text-[#6b7280]";

	const buttonStyle =
		variant === "primary"
			? {
					borderColor: lightStyles.button.borderColor,
					color: lightStyles.button.color,
				}
			: {
					borderColor: "#d1d5db",
					color: "#6b7280",
				};

	return (
		<ReactEmailButton
			className={`${baseClasses} ${variantClasses} ${className}`}
			href={href}
			style={buttonStyle}
		>
			{children}
		</ReactEmailButton>
	);
}
