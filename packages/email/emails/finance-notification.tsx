import { Section } from "@react-email/components";
import * as React from "react";
import { Button } from "../components/button";
import { EmailFrame, type EmailTone } from "../components/email-frame";
import { FallbackLink } from "../components/fallback-link";
import { Ledger, type LedgerRow } from "../components/ledger";
import { Notice } from "../components/notice";

export type FinanceNotificationEmailProps = {
	amount?: string;
	category?: string;
	ctaHref?: string | null;
	ctaLabel?: string;
	eventLabel: string;
	greetingName?: string | null;
	metadata?: Array<{ label: string; value: string }>;
	message: string;
	reference?: string | null;
	schoolName: string;
	subtitle?: string;
	title: string;
	tone?: EmailTone;
};

export function FinanceNotificationEmail({
	amount,
	category = "Finance",
	ctaHref,
	ctaLabel = "Open transaction",
	eventLabel,
	greetingName,
	metadata = [],
	message,
	reference,
	schoolName,
	subtitle,
	title,
	tone = "success",
}: FinanceNotificationEmailProps) {
	const rows: LedgerRow[] = [
		...(amount ? [{ label: "Amount", value: amount }] : []),
		...metadata,
	];

	return (
		<EmailFrame
			category={category}
			eyebrow={eventLabel}
			intro={
				<>
					{greetingName ? `Hello ${greetingName}, ` : ""}
					{message}
				</>
			}
			preview={title}
			reference={reference ?? category}
			schoolName={schoolName}
			title={title}
			tone={tone}
		>
			{rows.length > 0 ? <Ledger rows={rows} /> : null}
			{subtitle ? <Notice>{subtitle}</Notice> : null}
			{ctaHref ? (
				<Section style={{ margin: "26px 0 12px" }}>
					<Button href={ctaHref}>{ctaLabel}</Button>
				</Section>
			) : null}
			<FallbackLink href={ctaHref} />
		</EmailFrame>
	);
}

export default function FinanceNotificationEmailPreview() {
	return (
		<FinanceNotificationEmail
			amount="₦125,000"
			ctaHref="https://dashboard.greenfield.school-clerk.com/finance/transactions"
			eventLabel="Student payment received"
			greetingName="Chioma"
			message="Greenfield Academy recorded a student payment for Amara Okafor."
			metadata={[
				{ label: "Student", value: "Amara Okafor" },
				{ label: "Method", value: "Bank transfer" },
				{ label: "Recorded by", value: "Bola Ahmed" },
			]}
			reference="Finance"
			schoolName="Greenfield Academy"
			title="Payment received from Amara Okafor"
		/>
	);
}
