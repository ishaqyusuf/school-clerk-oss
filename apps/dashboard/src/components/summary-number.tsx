"use client";

import { AnimatedNumber } from "@/components/animated-number";
import type { ComponentProps, ReactNode } from "react";

// NumberFlow's unbroken animated digits cannot wrap in a narrow summary card.
// Keep its desktop presentation and expose the same full value as mobile text.
export function SummaryNumber({
	children,
	currencyDisplay = "narrowSymbol",
	...props
}: ComponentProps<typeof AnimatedNumber> & {
	children?: ReactNode;
	currencyDisplay?: "narrowSymbol" | "code";
}) {
	const formatted = new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: props.currency ?? "NGN",
		currencyDisplay,
		minimumFractionDigits: props.minimumFractionDigits,
		maximumFractionDigits: props.maximumFractionDigits,
	}).format(props.value);

	return (
		<>
			<span data-summary-number-static>{formatted}</span>
			<span data-summary-number-animated>
				{children ?? <AnimatedNumber {...props} />}
			</span>
		</>
	);
}
