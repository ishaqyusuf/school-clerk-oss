import { Section, Text } from "@react-email/components";
import { LogoFooter } from "./logo-footer";
import { emailTheme } from "./theme";

export function Footer({
	category,
	contactLine,
	schoolName,
}: {
	category?: string;
	contactLine?: string;
	schoolName: string;
}) {
	return (
		<Section
			className="email-footer"
			style={{
				backgroundColor: "#f5f1e7",
				borderTop: `1px solid ${emailTheme.light.border}`,
			}}
		>
			<Text
				style={{
					color: emailTheme.light.foreground,
					fontFamily: "Georgia, 'Times New Roman', serif",
					fontSize: "18px",
					fontWeight: 400,
					lineHeight: "24px",
					margin: 0,
				}}
			>
				Clear records. Confident school decisions.
			</Text>

			<Text
				style={{
					color: emailTheme.light.muted,
					fontSize: "11px",
					lineHeight: "18px",
					margin: "12px 0 0",
				}}
			>
				This notice was sent by {schoolName} through School Clerk.
				{contactLine || category ? <br /> : null}
				{contactLine ?? category}
			</Text>

			<Text
				style={{
					color: emailTheme.light.secondary,
					fontSize: "10px",
					lineHeight: "16px",
					margin: "14px 0 8px",
				}}
			>
				Tenant-aware school operations
			</Text>

			<LogoFooter />
		</Section>
	);
}
