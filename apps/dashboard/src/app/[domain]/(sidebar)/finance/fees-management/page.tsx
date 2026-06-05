import { FinanceItemsPage } from "@/components/finance/finance-items-page";

export default async function Page() {
	return <FinanceItemsPage filter={{ excludeType: "SERVICE" }} />;
}
