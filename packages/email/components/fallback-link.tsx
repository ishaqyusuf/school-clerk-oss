import { Link, Text } from "@react-email/components";
import { emailTheme } from "./theme";

export function FallbackLink({ href }: { href?: string | null }) {
	if (!href) return null;

	return (
		<Text
			style={{
				color: emailTheme.light.muted,
				fontSize: "11px",
				lineHeight: "17px",
				margin: "8px 0 0",
				wordBreak: "break-all",
			}}
		>
			If the button does not work, visit:{" "}
			<Link href={href} style={{ color: emailTheme.light.muted }}>
				{href}
			</Link>
		</Text>
	);
}
