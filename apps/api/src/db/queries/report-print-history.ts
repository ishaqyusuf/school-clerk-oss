export function getLatestReportPrintStatus({
	logs,
	requestedTermFormIds,
}: {
	logs: Array<{
		printedAt: Date;
		termFormIds: string[];
	}>;
	requestedTermFormIds: string[];
}) {
	const requestedIds = new Set(requestedTermFormIds);
	const latestPrintedAtByTermFormId: Record<string, Date> = {};

	for (const log of [...logs].sort(
		(left, right) => right.printedAt.getTime() - left.printedAt.getTime(),
	)) {
		for (const termFormId of log.termFormIds) {
			if (
				requestedIds.has(termFormId) &&
				!latestPrintedAtByTermFormId[termFormId]
			) {
				latestPrintedAtByTermFormId[termFormId] = log.printedAt;
			}
		}
	}

	return latestPrintedAtByTermFormId;
}
