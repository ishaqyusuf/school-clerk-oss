import * as React from "react";
import {
	Body,
	Container,
	Heading,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Footer } from "../components/footer";
import { Logo } from "../components/logo";
import {
	Button,
	EmailThemeProvider,
	getEmailInlineStyles,
	getEmailThemeClasses,
} from "../components/theme";

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
	const themeClasses = getEmailThemeClasses();
	const lightStyles = getEmailInlineStyles("light");

	return (
		<EmailThemeProvider preview={<Preview>{title}</Preview>}>
			<Body style={body}>
				<Container
					className={`my-[40px] mx-auto p-[32px] max-w-[560px] ${themeClasses.container}`}
					style={{
						...container,
						borderColor: lightStyles.container.borderColor,
					}}
				>
					<Logo />
					<Section className="mt-[18px] mb-[12px]">
						<Text className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#7c5f10]">
							{eventLabel}
						</Text>
					</Section>
					<Heading
						className={`mx-0 my-[16px] text-[28px] leading-[34px] ${themeClasses.heading}`}
						style={{ color: lightStyles.text.color }}
					>
						{title}
					</Heading>
					<Text className={`text-[15px] leading-[24px] ${themeClasses.text}`} style={{ color: lightStyles.text.color }}>
						Hello {greetingName || "there"},
					</Text>
					<Text className={`text-[15px] leading-[24px] ${themeClasses.text}`} style={{ color: lightStyles.text.color }}>
						{message}
					</Text>
					{subtitle ? (
						<Text
							className={`text-[13px] leading-[20px] ${themeClasses.mutedText}`}
							style={{ color: lightStyles.mutedText.color }}
						>
							{subtitle}
						</Text>
					) : null}
					{amount ? (
						<Section style={amountCard} className="email-border">
							<Text style={amountLabel} className={themeClasses.mutedText}>
								Amount
							</Text>
							<Text style={amountValue} className={themeClasses.text}>
								{amount}
							</Text>
						</Section>
					) : null}
					{metadata.length > 0 ? (
						<Section style={metaCard} className="email-border">
							{metadata.map((item) => (
								<Text
									key={`${item.label}:${item.value}`}
									style={metaItem}
									className={themeClasses.text}
								>
									<strong>{item.label}:</strong> {item.value}
								</Text>
							))}
						</Section>
					) : null}
					{ctaHref ? (
						<Section className="mb-[12px] mt-[24px] text-center">
							<Button href={ctaHref}>
								{ctaLabel}
							</Button>
						</Section>
					) : null}
					<Text
						className={`mt-[28px] text-[12px] leading-[18px] ${themeClasses.secondaryText}`}
						style={{ color: lightStyles.secondaryText.color }}
					>
						This message was sent by {schoolName} via School Clerk.
					</Text>
					<Footer />
				</Container>
			</Body>
		</EmailThemeProvider>
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
