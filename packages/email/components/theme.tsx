import { Head, Html, Tailwind } from "@react-email/components";
import type React from "react";

export { Button } from "./button";

export const emailTheme = {
	light: {
		accent: "#17263d",
		background: "#ebe7dd",
		border: "#d9d1bf",
		foreground: "#17263d",
		gold: "#b6842f",
		muted: "#657080",
		paper: "#fffdf8",
		secondary: "#657080",
		success: "#2f6b4f",
		warning: "#9a4e2f",
	},
} as const;

export function getEmailDarkModeCSS() {
	return `
		:root {
			color-scheme: light;
			supported-color-schemes: light;
		}

		.email-pad {
			padding: 34px 42px !important;
		}
		.email-footer {
			padding: 25px 42px 30px !important;
		}

		@media only screen and (max-width: 640px) {
			.email-pad {
				padding: 28px 24px !important;
			}
			.email-footer {
				padding: 22px 24px 26px !important;
			}
			.email-folio {
				display: none !important;
			}
			.email-action {
				display: block !important;
				margin: 8px 0 0 !important;
				text-align: center !important;
			}
		}
	`;
}

type EmailThemeProviderProps = {
	additionalHeadContent?: React.ReactNode;
	children: React.ReactNode;
	preview?: React.ReactNode;
};

export function EmailThemeProvider({
	additionalHeadContent,
	children,
	preview,
}: EmailThemeProviderProps) {
	return (
		<Html>
			<Tailwind
				config={{
					theme: {
						extend: {
							fontFamily: {
								sans: ["Arial", "Helvetica", "sans-serif"],
								serif: ["Georgia", "Times New Roman", "serif"],
							},
						},
					},
				}}
			>
				<Head>
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<meta name="color-scheme" content="light" />
					<meta name="supported-color-schemes" content="light" />
					<style>{getEmailDarkModeCSS()}</style>
					{additionalHeadContent}
				</Head>
				{preview}
				{children}
			</Tailwind>
		</Html>
	);
}

export function getEmailThemeClasses() {
	return {
		body: "email-body",
		button: "email-accent",
		container: "email-container",
		border: "email-border",
		heading: "email-text",
		link: "email-text",
		mutedLink: "email-muted",
		mutedText: "email-muted",
		secondaryText: "email-secondary",
		text: "email-text",
	};
}

export function getEmailInlineStyles(mode: "light" | "dark" = "light") {
	const theme = emailTheme.light;

	return {
		body: {
			backgroundColor: theme.background,
			color: theme.foreground,
		},
		button: {
			borderColor: theme.accent,
			color: theme.accent,
		},
		container: {
			borderColor: theme.border,
			backgroundColor: theme.paper,
		},
		mutedText: {
			color: theme.muted,
		},
		secondaryText: {
			color: theme.secondary,
		},
		text: {
			color: theme.foreground,
		},
	};
}

export function useEmailTheme() {
	return {
		classes: getEmailThemeClasses(),
		lightStyles: getEmailInlineStyles("light"),
	};
}
