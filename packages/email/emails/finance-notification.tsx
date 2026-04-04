import * as React from "react";
import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";

export type FinanceNotificationEmailProps = {
	amount?: string;
	ctaHref?: string | null;
	ctaLabel?: string;
	eventLabel: string;
	greetingName?: string | null;
	metadata?: Array<{ label: string; value: string }>;
	message: string;
	schoolName: string;
	subtitle?: string;
	title: string;
};

export function FinanceNotificationEmail({
	amount,
	ctaHref,
	ctaLabel = "Open dashboard",
	eventLabel,
	greetingName,
	metadata = [],
	message,
	schoolName,
	subtitle,
	title,
}: FinanceNotificationEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>{title}</Preview>
			<Body style={body}>
				<Container style={container}>
					<Section style={eyebrowWrap}>
						<Text style={eyebrow}>{eventLabel}</Text>
					</Section>
					<Heading style={heading}>{title}</Heading>
					<Text style={paragraph}>
						Hello {greetingName || "there"},
					</Text>
					<Text style={paragraph}>{message}</Text>
					{subtitle ? <Text style={muted}>{subtitle}</Text> : null}
					{amount ? (
						<Section style={amountCard}>
							<Text style={amountLabel}>Amount</Text>
							<Text style={amountValue}>{amount}</Text>
						</Section>
					) : null}
					{metadata.length > 0 ? (
						<Section style={metaCard}>
							{metadata.map((item) => (
								<Text key={`${item.label}:${item.value}`} style={metaItem}>
									<strong>{item.label}:</strong> {item.value}
								</Text>
							))}
						</Section>
					) : null}
					{ctaHref ? (
						<Section style={buttonWrap}>
							<Button href={ctaHref} style={button}>
								{ctaLabel}
							</Button>
						</Section>
					) : null}
					<Text style={footer}>
						This message was sent by {schoolName} via School Clerk.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

const body = {
	backgroundColor: "#f5f4ef",
	fontFamily: "Arial, sans-serif",
	margin: 0,
	padding: "24px 0",
};

const container = {
	backgroundColor: "#ffffff",
	border: "1px solid #e7e5dd",
	borderRadius: "16px",
	margin: "0 auto",
	maxWidth: "560px",
	padding: "32px",
};

const eyebrowWrap = {
	marginBottom: "12px",
};

const eyebrow = {
	color: "#7c5f10",
	fontSize: "12px",
	fontWeight: "700",
	letterSpacing: "0.08em",
	margin: 0,
	textTransform: "uppercase" as const,
};

const heading = {
	color: "#141414",
	fontSize: "28px",
	lineHeight: "34px",
	margin: "0 0 16px",
};

const paragraph = {
	color: "#333333",
	fontSize: "15px",
	lineHeight: "24px",
	margin: "0 0 12px",
};

const muted = {
	color: "#6b7280",
	fontSize: "13px",
	lineHeight: "20px",
	margin: "0 0 12px",
};

const amountCard = {
	backgroundColor: "#f8fafc",
	border: "1px solid #dbe3ea",
	borderRadius: "14px",
	margin: "20px 0",
	padding: "18px 20px",
};

const amountLabel = {
	color: "#64748b",
	fontSize: "12px",
	fontWeight: "600",
	margin: "0 0 8px",
	textTransform: "uppercase" as const,
};

const amountValue = {
	color: "#0f172a",
	fontSize: "28px",
	fontWeight: "700",
	lineHeight: "32px",
	margin: 0,
};

const metaCard = {
	backgroundColor: "#fafaf9",
	border: "1px solid #ece8df",
	borderRadius: "14px",
	margin: "20px 0",
	padding: "16px 20px",
};

const metaItem = {
	color: "#3f3f46",
	fontSize: "14px",
	lineHeight: "22px",
	margin: "0 0 6px",
};

const buttonWrap = {
	margin: "24px 0 12px",
};

const button = {
	backgroundColor: "#111827",
	borderRadius: "10px",
	color: "#ffffff",
	display: "inline-block",
	fontSize: "14px",
	fontWeight: "700",
	padding: "12px 18px",
	textDecoration: "none",
};

const footer = {
	color: "#71717a",
	fontSize: "12px",
	lineHeight: "18px",
	marginTop: "28px",
};
