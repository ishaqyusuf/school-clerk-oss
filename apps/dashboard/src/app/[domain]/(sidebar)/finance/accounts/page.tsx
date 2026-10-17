import { FinancePage } from "@/components/finance/finance-page";
import { FinanceSectionTabs } from "@/components/finance/finance-section-tabs";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	return (
		<FinancePage
			searchParams={await searchParams}
			title="Accounts"
			tabs={<FinanceSectionTabs section="accounts" />}
		/>
	);
}
