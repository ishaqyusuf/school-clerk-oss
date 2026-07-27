import { useQueryStates } from "nuqs";
import {
	createLoader,
	parseAsArrayOf,
	parseAsString,
	parseAsStringEnum,
} from "nuqs/server";

const periods = ["term", "session", "all"] as const;
const accountTypes = ["CREDIT", "DEBIT"] as const;
const healthValues = [
	"healthy",
	"needs_funding",
	"deficit",
	"no_activity",
] as const;
const sortFields = [
	"name",
	"accountType",
	"moneyIn",
	"moneyOut",
	"ledgerBalance",
	"pendingObligations",
	"projectedBalance",
	"health",
	"lastActivityAt",
] as const;

export const financeWorkspaceParams = {
	q: parseAsString,
	period: parseAsStringEnum([...periods]).withDefault("term"),
	accountTypes: parseAsArrayOf(parseAsStringEnum([...accountTypes])),
	health: parseAsArrayOf(parseAsStringEnum([...healthValues])),
	sortField: parseAsStringEnum([...sortFields]).withDefault("name"),
	sortDirection: parseAsStringEnum(["asc", "desc"]).withDefault("asc"),
};

export const loadFinanceWorkspaceParams = createLoader(financeWorkspaceParams);

export function useFinanceWorkspaceParams() {
	const [filter, setFilter] = useQueryStates(financeWorkspaceParams, {
		history: "replace",
		shallow: true,
	});
	const hasFilters =
		Boolean(filter.q) ||
		Boolean(filter.accountTypes?.length) ||
		Boolean(filter.health?.length);

	return { filter, setFilter, hasFilters };
}
