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
		"email-action text-[13px] font-bold no-underline text-center px-[19px] py-[13px] border border-solid";
	const variantClasses =
		variant === "primary"
			? `${themeClasses.button} bg-[#17263d] text-white`
			: "border-[#17263d] text-[#17263d]";

	const buttonStyle =
		variant === "primary"
			? {
					backgroundColor: "#17263d",
					borderColor: lightStyles.button.borderColor,
					color: "#ffffff",
				}
			: {
					backgroundColor: "transparent",
					borderColor: "#17263d",
					color: "#17263d",
				};

	return (
		<ReactEmailButton
			className={`${baseClasses} ${variantClasses} ${className}`}
			href={href}
			style={{
				...buttonStyle,
				borderRadius: 0,
				boxSizing: "border-box",
				letterSpacing: "0.02em",
				padding: "13px 19px",
			}}
		>
			{children}
		</ReactEmailButton>
	);
}
