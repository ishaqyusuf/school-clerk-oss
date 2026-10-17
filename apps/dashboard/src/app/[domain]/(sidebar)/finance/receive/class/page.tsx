import { ClassCollectionSheet } from "@/components/finance/class-collection-sheet";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default function Page() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<PageTitle>Collect by Class</PageTitle>
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Collect by Class</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Pick a class and a fee, then type each student's payment down the
					roster. Every row posts as its own receipt.
				</p>
			</div>
			<ClassCollectionSheet />
		</div>
	);
}
