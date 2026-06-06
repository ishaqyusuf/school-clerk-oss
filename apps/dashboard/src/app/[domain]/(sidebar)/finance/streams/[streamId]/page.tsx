import { redirect } from "next/navigation";
import {
	type FinanceRedirectSearchParams,
	redirectTargetWithSearch,
} from "../../redirect-with-search";

type PageProps = {
	params: Promise<{
		streamId: string;
	}>;
	searchParams?: FinanceRedirectSearchParams;
};

export default async function Page({ params, searchParams }: PageProps) {
	const { streamId } = await params;
	redirect(
		await redirectTargetWithSearch(
			`/finance/accounts/${streamId}`,
			searchParams,
		),
	);
}
