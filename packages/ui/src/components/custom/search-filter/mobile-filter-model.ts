export type FilterValues = Record<string, unknown>;

export type MobileFilterOption = {
	value: string;
	label: string;
	subLabel?: string;
	parentValue?: string;
};

export type MobileFilterGroup = {
	key: string;
	label: string;
	options?: MobileFilterOption[];
	multiple?: boolean;
	resetValue?: unknown;
	type?: string;
	loading?: boolean;
	error?: string;
};

export function selectFilterOption(
	values: FilterValues,
	group: MobileFilterGroup,
	option: MobileFilterOption,
): FilterValues {
	if (option.value === "") return { [group.key]: group.resetValue ?? null };
	const current = values[group.key];
	return {
		[group.key]: group.multiple
			? Array.isArray(current) && current.includes(option.value)
				? current.filter((value) => value !== option.value)
				: [...(Array.isArray(current) ? current : []), option.value]
			: option.value,
	};
}

// Only the sheet's filter keys are committed. Search, sort and unrelated URL
// state can change independently while filter choices are being edited.
export function filterSheetPatch(
	values: FilterValues,
	groups: MobileFilterGroup[],
) {
	return Object.fromEntries(
		groups.map((group) => [
			group.key,
			values[group.key] ?? group.resetValue ?? null,
		]),
	);
}

export function resetFilterDraft(
	values: FilterValues,
	groups: MobileFilterGroup[],
) {
	return {
		...values,
		...Object.fromEntries(
			groups.map((group) => [group.key, group.resetValue ?? null]),
		),
	};
}

export function filterGroupSummary(group: MobileFilterGroup, value: unknown) {
	const values = Array.isArray(value)
		? value
		: value == null || value === ""
			? []
			: [value];
	if (!values.length) return "All";
	return values
		.map(
			(value) =>
				group.options?.find((option) => option.value === value)?.label ??
				String(value),
		)
		.join(", ");
}
