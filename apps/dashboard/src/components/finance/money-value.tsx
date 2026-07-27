import { cn } from "@school-clerk/ui/cn";

const formatter = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

export function MoneyValue({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	return (
		<span className={cn("tabular-nums", className)}>
			{formatter.format(Number(value) || 0)}
		</span>
	);
}
