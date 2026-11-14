import type { QueryClient } from "@tanstack/react-query";

/**
 * Client cache for the assessment recording filter.
 *
 * Two caches with different lifetimes:
 * - Filter options (terms → classrooms → subjects) barely change, so they
 *   stay fresh for a long time and are only marked stale by mutations that
 *   can change them (see `markRecordingCachesStaleAfterMutation`).
 * - Recording progress (the percentages) changes with every score save. A
 *   save marks only its own classroom dirty; the next time the filter opens,
 *   just the dirty classrooms are re-counted and merged into the cache.
 */

export const RECORDING_OPTIONS_STALE_TIME = 30 * 60 * 1000;
export const RECORDING_PROGRESS_STALE_TIME = 5 * 60 * 1000;
export const RECORDING_CACHE_GC_TIME = 60 * 60 * 1000;

const OPTIONS_PATH = ["assessments", "getRecordingContextOptions"];
const PROGRESS_PATH = ["assessments", "getRecordingProgress"];

/** Routers whose writes can change terms, classrooms, subjects or columns. */
const STRUCTURE_ROUTERS = new Set([
	"academics",
	"assessments",
	"classrooms",
	"enrollments",
	"staff",
	"students",
	"subjects",
]);

export type ProgressSnapshot = {
	students: number;
	assessments: number;
	recorded: number;
	expected: number;
	subjects: Record<string, { recorded: number; expected: number }>;
};

type ProgressData = {
	termId: string;
	classrooms: Record<string, ProgressSnapshot>;
};

type ProgressFetcher = (input: {
	termId: string;
	departmentIds: string[];
}) => Promise<ProgressData>;

const dirtyClassrooms = new Set<string>();

/** A score was saved in this classroom; its progress is out of date. */
export function markRecordingProgressDirty(departmentId: string) {
	if (departmentId) dirtyClassrooms.add(departmentId);
}

export function hasDirtyRecordingProgress() {
	return dirtyClassrooms.size > 0;
}

/** Sorted, de-duplicated ids so the same classroom set shares one cache entry. */
export function progressDepartmentIds(ids: Array<string | null | undefined>) {
	return Array.from(new Set(ids.filter((id): id is string => !!id))).sort();
}

/**
 * Re-counts only the dirty classrooms in every cached progress entry and
 * merges the result, instead of re-counting the whole term.
 */
export async function refreshDirtyRecordingProgress(
	qc: QueryClient,
	fetchProgress: ProgressFetcher,
) {
	if (!dirtyClassrooms.size) return;
	const dirty = new Set(dirtyClassrooms);
	const entries = qc.getQueriesData<ProgressData>({
		queryKey: [PROGRESS_PATH],
	});
	const byTerm = new Map<string, Set<string>>();
	for (const [, data] of entries) {
		if (!data) continue;
		for (const id of Object.keys(data.classrooms)) {
			if (!dirty.has(id)) continue;
			const ids = byTerm.get(data.termId) ?? new Set<string>();
			ids.add(id);
			byTerm.set(data.termId, ids);
		}
	}
	for (const id of dirty) dirtyClassrooms.delete(id);
	if (!byTerm.size) return;

	try {
		await Promise.all(
			Array.from(byTerm, async ([termId, ids]) => {
				const fresh = await fetchProgress({
					termId,
					departmentIds: Array.from(ids),
				});
				qc.setQueriesData<ProgressData>(
					{ queryKey: [PROGRESS_PATH] },
					(current) =>
						current && current.termId === termId
							? {
									...current,
									classrooms: {
										...current.classrooms,
										...Object.fromEntries(
											Object.entries(fresh.classrooms).filter(
												([id]) => id in current.classrooms,
											),
										),
									},
								}
							: current,
				);
			}),
		);
	} catch {
		// Keep them dirty so the next open retries.
		for (const ids of byTerm.values()) {
			for (const id of ids) dirtyClassrooms.add(id);
		}
	}
}

function mutationPath(mutationKey: unknown): string[] | null {
	if (!Array.isArray(mutationKey)) return null;
	const [path] = mutationKey;
	return Array.isArray(path) && path.every((part) => typeof part === "string")
		? path
		: null;
}

/**
 * Called for every successful tRPC mutation. Writes that can change the
 * recording structure mark the long-lived caches stale; nothing refetches
 * until the recording page or filter needs the data again.
 */
export function markRecordingCachesStaleAfterMutation(
	qc: QueryClient,
	mutationKey: unknown,
) {
	const path = mutationPath(mutationKey);
	if (!path?.[0] || !STRUCTURE_ROUTERS.has(path[0])) return;
	qc.invalidateQueries({ queryKey: [OPTIONS_PATH], refetchType: "none" });
	qc.invalidateQueries({ queryKey: [PROGRESS_PATH], refetchType: "none" });
}

type SavedScore = {
	assessmentId: number;
	studentTermFormId: string;
	studentId: string;
	id: number | null | undefined;
	obtained: number | null | undefined;
};

type ReportResult = {
	id?: number | null;
	obtained?: number | null;
	studentTermFormId?: string | null;
	studentId?: string | null;
	[key: string]: unknown;
};

type ReportLike = {
	subjects?: Array<{
		assessments?: Array<{
			id: number;
			assessmentResults?: ReportResult[] | null;
			[key: string]: unknown;
		}> | null;
		[key: string]: unknown;
	}> | null;
	[key: string]: unknown;
};

/**
 * Writes one saved score into a cached report sheet, so the table's totals
 * and subject progress update without re-downloading the whole classroom.
 * Returns the same object when the score's column is not in this report.
 */
export function applySavedScoreToReport<T extends ReportLike>(
	report: T | undefined,
	score: SavedScore,
): T | undefined {
	if (!report?.subjects) return report;
	let changed = false;
	const subjects = report.subjects.map((subject) => {
		if (!subject.assessments?.some((a) => a.id === score.assessmentId)) {
			return subject;
		}
		changed = true;
		return {
			...subject,
			assessments: subject.assessments.map((assessment) => {
				if (assessment.id !== score.assessmentId) return assessment;
				const results = assessment.assessmentResults ?? [];
				const index = results.findIndex(
					(result) => result.studentTermFormId === score.studentTermFormId,
				);
				const saved = {
					...(index >= 0 ? results[index] : {}),
					id: score.id ?? (index >= 0 ? results[index]?.id : null) ?? null,
					obtained: score.obtained ?? null,
					studentTermFormId: score.studentTermFormId,
					studentId: score.studentId,
				};
				return {
					...assessment,
					assessmentResults:
						index >= 0
							? results.map((result, i) => (i === index ? saved : result))
							: [...results, { percentageScore: null, ...saved }],
				};
			}),
		};
	});
	return changed ? { ...report, subjects } : report;
}
