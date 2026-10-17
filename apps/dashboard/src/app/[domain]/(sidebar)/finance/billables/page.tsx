import {
	type FinanceRedirectSearchParams,
	legacyFinanceRedirect,
} from "../redirect-with-search";

export default async function Page({
	searchParams,
}: {
	searchParams?: FinanceRedirectSearchParams;
}) {
	await legacyFinanceRedirect("/finance/billables", searchParams);
}
