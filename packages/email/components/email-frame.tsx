import {
	Body,
	Column,
	Container,
	Heading,
	Preview,
	Row,
	Section,
	Text,
} from "@react-email/components";
import type React from "react";
import { Footer } from "./footer";
import { Logo } from "./logo";
import {
	EmailThemeProvider,
	emailTheme,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "./theme";

export type EmailTone = "info" | "success" | "warning";

export type EmailFrameProps = {
	category: string;
	children: React.ReactNode;
	contactLine?: string;
	eyebrow: string;
	intro: React.ReactNode;
	preview: string;
	reference?: string | null;
	schoolName: string;
	title: React.ReactNode;
	tone?: EmailTone;
};

function getToneColor(tone: EmailTone) {
	if (tone === "warning") return emailTheme.light.warning;
	if (tone === "info") return emailTheme.light.gold;
	return emailTheme.light.success;
}

export function EmailFrame({
	category,
	children,
	contactLine,
	eyebrow,
	intro,
	preview,
	reference,
	schoolName,
	title,
	tone = "success",
}: EmailFrameProps) {
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider preview={<Preview>{preview}</Preview>}>
			<Body
				className={`my-0 mx-auto font-sans ${themeClasses.body}`}
				style={{
					...lightStyles.body,
					fontFamily: "Arial, Helvetica, sans-serif",
					margin: 0,
					padding: "28px 12px",
				}}
			>
				<Container
					className={themeClasses.container}
					style={{
						backgroundColor: lightStyles.container.backgroundColor,
						border: `1px solid ${lightStyles.container.borderColor}`,
						margin: "0 auto",
						maxWidth: "600px",
					}}
				>
					<Section
						style={{
							backgroundColor: emailTheme.light.foreground,
							height: "5px",
							lineHeight: "5px",
						}}
					/>
					<Section className="email-pad">
						<Row>
							<Column>
								<Logo schoolName={schoolName} />
							</Column>
							{reference ? (
								<Column
									align="right"
									className="email-folio"
									style={{ verticalAlign: "top" }}
								>
									<Text
										style={{
											color: emailTheme.light.gold,
											fontSize: "12px",
											fontWeight: 700,
											letterSpacing: "0.09em",
											lineHeight: "18px",
											margin: 0,
											textTransform: "uppercase",
										}}
									>
										{reference}
									</Text>
								</Column>
							) : null}
						</Row>

						<Text
							style={{
								color: getToneColor(tone),
								fontSize: "12px",
								fontWeight: 700,
								letterSpacing: "0.1em",
								lineHeight: "18px",
								margin: "36px 0 10px",
								textTransform: "uppercase",
							}}
						>
							{eyebrow}
						</Text>
						<Heading
							className={`font-serif ${themeClasses.heading}`}
							style={{
								color: lightStyles.text.color,
								fontFamily: "Georgia, 'Times New Roman', serif",
								fontSize: "34px",
								fontWeight: 400,
								letterSpacing: "-0.02em",
								lineHeight: "37px",
								margin: "0 0 18px",
							}}
						>
							{title}
						</Heading>
						<Text
							className={themeClasses.text}
							style={{
								color: "#334055",
								fontSize: "15px",
								lineHeight: "25px",
								margin: "0 0 24px",
							}}
						>
							{intro}
						</Text>
						{children}
					</Section>
					<Footer
						category={category}
						contactLine={contactLine}
						schoolName={schoolName}
					/>
				</Container>
			</Body>
		</EmailThemeProvider>
	);
}
