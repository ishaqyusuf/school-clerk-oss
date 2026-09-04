import { Section, Text } from "@react-email/components";
import type React from "react";
import { emailTheme } from "./theme";

export function Notice({ children }: { children: React.ReactNode }) {
	return (
		<Section
			style={{
				backgroundColor: "#f3efe4",
				borderLeft: `3px solid ${emailTheme.light.gold}`,
				margin: "22px 0 0",
				padding: "15px 16px",
			}}
		>
			<Text
				style={{
					color: "#394457",
					fontSize: "13px",
					lineHeight: "20px",
					margin: 0,
				}}
			>
				{children}
			</Text>
		</Section>
	);
}
