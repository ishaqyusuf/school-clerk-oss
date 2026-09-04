import { Text } from "@react-email/components";
import { emailTheme } from "./theme";

export function Logo({ schoolName }: { schoolName: string }) {
	return (
		<>
			<Text
				style={{
					color: emailTheme.light.foreground,
					fontFamily: "Arial, Helvetica, sans-serif",
					fontSize: "15px",
					fontWeight: 700,
					letterSpacing: "0.06em",
					lineHeight: "18px",
					margin: 0,
					textTransform: "uppercase",
				}}
			>
				{schoolName}
			</Text>
			<Text
				style={{
					color: emailTheme.light.muted,
					fontSize: "12px",
					lineHeight: "18px",
					margin: "6px 0 0",
				}}
			>
				Powered by School Clerk
			</Text>
		</>
	);
}
