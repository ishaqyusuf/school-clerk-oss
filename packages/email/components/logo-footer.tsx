import { Section, Text } from "@react-email/components";
import { emailTheme } from "./theme";

export function LogoFooter() {
	return (
		<Section>
			<Text
				style={{
					color: emailTheme.light.foreground,
					fontSize: "11px",
					fontWeight: 700,
					letterSpacing: "0.08em",
					margin: 0,
					textDecoration: "none",
					textTransform: "uppercase",
				}}
			>
				School Clerk
			</Text>
		</Section>
	);
}
