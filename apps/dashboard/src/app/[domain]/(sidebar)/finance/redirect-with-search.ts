type SearchParamValue = string | string[] | undefined;

export type FinanceRedirectSearchParams =
	| Promise<Record<string, SearchParamValue>>
	| Record<string, SearchParamValue>
	| undefined;

export async function redirectTargetWithSearch(
	target: string,
	searchParams: FinanceRedirectSearchParams,
) {
	const resolved = searchParams ? await searchParams : undefined;
	if (!resolved) return target;

	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(resolved)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				params.append(key, item);
			}
			continue;
		}

		if (typeof value === "string") {
			params.set(key, value);
		}
	}

	const query = params.toString();
	return query ? `${target}?${query}` : target;
}
