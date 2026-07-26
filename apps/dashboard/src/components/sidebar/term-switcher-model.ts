export type TermSwitcherTerm = {
	id: string;
	startDate: Date | string | null;
	status?: string;
	title: string;
};

export type TermSwitcherSession = {
	id: string;
	name: string;
	status?: string;
	terms: TermSwitcherTerm[];
};

export function buildTermSwitcherModel(
	sessions: TermSwitcherSession[],
	currentSessionId?: string | null,
	currentTermId?: string | null,
) {
	const groups = sessions.map((session) => ({
		...session,
		status: session.status ?? "unknown",
		terms: session.terms
			.filter((term) => term.startDate != null)
			.map((term) => ({
				...term,
				status: term.status ?? "unknown",
			})),
	}));
	const currentSession =
		groups.find((session) =>
			session.terms.some((term) => term.id === currentTermId),
		) ??
		groups.find((session) => session.id === currentSessionId) ??
		null;
	const currentTerm =
		currentSession?.terms.find((term) => term.id === currentTermId) ?? null;

	return {
		currentSession,
		currentTerm,
		groups,
	};
}

export function isTermSwitcherSession(
	session: unknown,
): session is TermSwitcherSession {
	if (!session || typeof session !== "object") {
		return false;
	}

	const candidate = session as {
		id?: unknown;
		name?: unknown;
		status?: unknown;
		terms?: unknown;
	};

	return Boolean(
		typeof candidate.id === "string" &&
			candidate.id.length > 0 &&
			typeof candidate.name === "string" &&
			candidate.name.length > 0 &&
			(candidate.status === undefined ||
				typeof candidate.status === "string") &&
			Array.isArray(candidate.terms) &&
			candidate.terms.every((term) => {
				if (!term || typeof term !== "object") {
					return false;
				}

				const candidateTerm = term as {
					id?: unknown;
					startDate?: unknown;
					status?: unknown;
					title?: unknown;
				};

				return (
					typeof candidateTerm.id === "string" &&
					candidateTerm.id.length > 0 &&
					typeof candidateTerm.title === "string" &&
					candidateTerm.title.length > 0 &&
					Object.hasOwn(term, "startDate") &&
					(candidateTerm.startDate === null ||
						typeof candidateTerm.startDate === "string" ||
						(candidateTerm.startDate instanceof Date &&
							!Number.isNaN(candidateTerm.startDate.getTime()))) &&
					(candidateTerm.status === undefined ||
						typeof candidateTerm.status === "string")
				);
			}),
	);
}

export function parseTermSwitcherSessions(
	sessions: readonly unknown[],
): TermSwitcherSession[] {
	return sessions.map((session) => {
		if (!isTermSwitcherSession(session)) {
			throw new Error("Academic dashboard returned incomplete session data.");
		}

		return session;
	});
}

export function getVisibleTermGroups(
	groups: TermSwitcherSession[],
	isAdmin: boolean,
	currentSessionId?: string | null,
) {
	if (isAdmin) {
		return groups;
	}

	return groups.filter((session) => session.id === currentSessionId);
}
