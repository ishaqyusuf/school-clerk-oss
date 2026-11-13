/**
 * One-line "who hears about this" summary for an activity notification rule
 * (ADR-0093, Workshop 03 Grouped digest settings).
 */

/** Optional fields: the dashboard infers API outputs without strictNullChecks. */
export type ActivityRuleShape = {
	enabled?: boolean;
	inApp?: boolean;
	email?: boolean;
	roles?: readonly string[];
	userIds?: readonly string[];
};

export type ActivityRuleSummary = {
	on: boolean;
	/** On, but nobody would actually be notified. */
	warn: boolean;
	text: string;
};

function plural(count: number, word: string) {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function summarizeActivityRule(
	rule: ActivityRuleShape,
): ActivityRuleSummary {
	if (!rule.enabled) return { on: false, warn: false, text: "Off" };
	const bits: string[] = [];
	const roles = rule.roles?.length ?? 0;
	const members = rule.userIds?.length ?? 0;
	if (roles) bits.push(plural(roles, "role"));
	if (members) bits.push(plural(members, "member"));
	if (!bits.length)
		return { on: true, warn: true, text: "On · no one selected" };
	if (!rule.inApp && !rule.email)
		return { on: true, warn: true, text: "On · no delivery" };
	return { on: true, warn: false, text: `Notifying ${bits.join(" · ")}` };
}

/** "2 of 5 notify" / "All silent" for a category card header. */
export function summarizeActivityCategory(rules: readonly ActivityRuleShape[]) {
	const on = rules.filter((rule) => rule.enabled).length;
	return on ? `${on} of ${rules.length} notify` : "All silent";
}
