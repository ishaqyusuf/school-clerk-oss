import { redirect } from "next/navigation";
import {
	type FinanceRedirectSearchParams,
	redirectTargetWithSearch,
} from "../redirect-with-search";

export default async function Page({
	searchParams,
}: {
	searchParams?: FinanceRedirectSearchParams;
}) {
	redirect(
		await redirectTargetWithSearch("/finance/payables/payroll", searchParams),
	);
}
