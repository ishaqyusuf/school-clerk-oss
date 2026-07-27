import { FinancePage } from "@/components/finance/finance-page";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	return <FinancePage searchParams={await searchParams} />;
}
