type PaymentTermSummaryProps = {
	paidForLabel?: string | null;
	collectedInLabel?: string | null;
};

export function buildTermScopedOptionLabel(
	title: string,
	termLabel?: string | null,
) {
	return termLabel ? `${title} — ${termLabel}` : title;
}

export function getEmptyTermPaymentOptionsMessage(termLabel?: string | null) {
	return `Type a payment type and description below to record a custom collection for ${termLabel || "this term"}.`;
}

export function PaymentTermSummary({
	paidForLabel,
	collectedInLabel,
}: PaymentTermSummaryProps) {
	if (!paidForLabel && !collectedInLabel) return null;

	if (!paidForLabel || paidForLabel === collectedInLabel) {
		return (
			<p className="text-xs text-muted-foreground">
				<span className="font-medium text-foreground">Term:</span>{" "}
				{paidForLabel || collectedInLabel}
			</p>
		);
	}

	return (
		<div className="space-y-0.5 text-xs text-muted-foreground">
			<p>
				<span className="font-medium text-foreground">Paid for:</span>{" "}
				{paidForLabel}
			</p>
			{collectedInLabel ? (
				<p>
					<span className="font-medium text-foreground">Collected in:</span>{" "}
					{collectedInLabel}
				</p>
			) : null}
		</div>
	);
}
