type FinanceResetPlaceholderProps = {
	title?: string;
};

export function FinanceResetPlaceholder({
	title = "Finance module reset",
}: FinanceResetPlaceholderProps) {
	return (
		<div className="mx-auto flex min-h-[420px] max-w-3xl flex-col justify-center gap-4 px-6 py-12">
			<div>
				<p className="text-sm font-medium text-muted-foreground">
					Finance rebuild in progress
				</p>
				<h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
			</div>
			<p className="text-muted-foreground">
				The legacy finance and accounting module has been intentionally reset.
				New standardized streams, charges, payments, payables, transfers, and
				balance sheets will be introduced in the next migration.
			</p>
		</div>
	);
}
