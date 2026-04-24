import { Font, Head, Html, Tailwind } from "@react-email/components";
import type React from "react";

export { Button } from "./button";

export const emailTheme = {
	light: {
		accent: "#111827",
		background: "#ffffff",
		border: "#e7e5dd",
		foreground: "#141414",
		muted: "#6b7280",
		secondary: "#71717a",
	},
	dark: {
		accent: "#fafafa",
		background: "#0d0d0d",
		border: "#1c1c1c",
		foreground: "#fafafa",
		muted: "#9ca3af",
		secondary: "#a1a1aa",
	},
} as const;

export function getEmailDarkModeCSS() {
	return `
		:root {
			color-scheme: light dark;
			supported-color-schemes: light dark;
		}

		@media (prefers-color-scheme: dark) {
			.email-body {
				background-color: ${emailTheme.dark.background} !important;
				color: ${emailTheme.dark.foreground} !important;
			}
			.email-container {
				border-color: ${emailTheme.dark.border} !important;
			}
			.email-text {
				color: ${emailTheme.dark.foreground} !important;
			}
			.email-muted {
				color: ${emailTheme.dark.muted} !important;
			}
			.email-secondary {
				color: ${emailTheme.dark.secondary} !important;
			}
			.email-accent {
				color: ${emailTheme.dark.accent} !important;
				border-color: ${emailTheme.dark.accent} !important;
			}
			.email-border {
				border-color: ${emailTheme.dark.border} !important;
			}
		}

		[data-ogsc] .email-text {
			color: ${emailTheme.dark.foreground} !important;
		}
		[data-ogsc] .email-muted {
			color: ${emailTheme.dark.muted} !important;
		}
		[data-ogsc] .email-secondary {
			color: ${emailTheme.dark.secondary} !important;
		}
		[data-ogsc] .email-accent {
			color: ${emailTheme.dark.accent} !important;
			border-color: ${emailTheme.dark.accent} !important;
		}
		[data-ogsb] .email-body {
			background-color: ${emailTheme.dark.background} !important;
		}
		[data-ogsb] .email-container {
			border-color: ${emailTheme.dark.border} !important;
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
					<meta name="color-scheme" content="light dark" />
					<meta name="supported-color-schemes" content="light dark" />
					<style>{getEmailDarkModeCSS()}</style>
					<Font
						fontFamily="Instrument Sans"
						fallbackFontFamily={["Arial", "Helvetica"]}
						webFont={{
							url: "https://fonts.gstatic.com/s/instrumentsans/v2/pxiEyp8kv8JHgFVrFJDUc1NECPY.woff2",
							format: "woff2",
						}}
						fontWeight={400}
						fontStyle="normal"
					/>
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
	const theme = emailTheme[mode];

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
