// JSONB may reorder object keys. Bind approvals to values, never insertion order.
export function canonicalJson(value: unknown): string {
	const normalize = (item: unknown): unknown =>
		Array.isArray(item)
			? item.map(normalize)
			: item && typeof item === "object"
				? Object.fromEntries(
						Object.entries(item)
							.filter(([, value]) => value !== undefined)
							.sort(([a], [b]) => a.localeCompare(b))
							.map(([key, value]) => [key, normalize(value)]),
					)
				: item;
	return JSON.stringify(normalize(value));
}
