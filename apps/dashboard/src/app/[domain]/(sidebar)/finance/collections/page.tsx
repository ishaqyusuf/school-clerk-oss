import { FinanceChargesPage } from "@/components/finance/finance-charges-page";

export default async function Page() {
	return <FinanceChargesPage title="Collections" filter={{ payerType: "SCHOOL" }} />;
}
