import { Column, Row, Section, Text } from "@react-email/components";
import type React from "react";
import { emailTheme } from "./theme";

export type LedgerRow = {
	label: string;
	value: React.ReactNode;
};

export function Ledger({ rows }: { rows: LedgerRow[] }) {
	return (
		<Section
			style={{
				borderBottom: `1px solid ${emailTheme.light.foreground}`,
				borderTop: `1px solid ${emailTheme.light.foreground}`,
			}}
		>
			{rows.map((row, index) => (
				<Row
					key={`${row.label}:${index}`}
					style={{
						borderBottom:
							index === rows.length - 1
								? "none"
								: `1px solid ${emailTheme.light.border}`,
					}}
				>
					<Column style={{ padding: "11px 0", width: "42%" }}>
						<Text
							style={{
								color: emailTheme.light.muted,
								fontSize: "13px",
								lineHeight: "18px",
								margin: 0,
							}}
						>
							{row.label}
						</Text>
					</Column>
					<Column align="right" style={{ padding: "11px 0" }}>
						<Text
							style={{
								color: emailTheme.light.foreground,
								fontSize: "13px",
								fontWeight: 700,
								lineHeight: "18px",
								margin: 0,
							}}
						>
							{row.value}
						</Text>
					</Column>
				</Row>
			))}
		</Section>
	);
}
