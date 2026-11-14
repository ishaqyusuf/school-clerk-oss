"use client";

import {
	useRecordingFilterOptions,
	useRecordingProgress,
	useRefreshRecordingFilter,
} from "@/hooks/use-recording-filter-data";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@school-clerk/ui/radio-group";
import {
	type FilterValues,
	type MobileFilterGroup,
	MobileFilterSheet,
} from "@school-clerk/ui/search-filter/mobile-filter-sheet";
import { Switch } from "@school-clerk/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { type RefObject, useEffect, useId, useState } from "react";
import type { SubjectRailItem } from "./subject-rail";

export type RecordingFilterTerm = {
	/** Optional in the API output type; terms without an id are skipped. */
	id?: string | null;
	label?: string | null;
	title?: string | null;
};

export type ClassroomRecordingProgress = {
	students: number;
	assessments: number;
	recorded: number;
	expected: number;
	/** Per department-subject counts; subjects without columns are absent. */
	subjects?: Record<string, { recorded: number; expected: number }>;
};

/** Light subject entry from the cached filter options (no scores). */
export type RecordingSubjectOption = {
	id: string;
	title: string;
	assessments: number;
};

export type RecordingFilterClassroom = {
	id: string;
	displayName?: string | null;
	departmentName?: string | null;
	recordingProgress?: ClassroomRecordingProgress | null;
	subjects?: RecordingSubjectOption[] | null;
};

export type RecordingFilterGroupKey = "termId" | "departmentId" | "subjectIds";

export type RecordingSubjectSelection = {
	/** Empty means "the classroom's first subject". */
	subjectIds: string[];
	multiple: boolean;
};

type Choice = {
	value: string;
	label: string;
	subLabel?: string;
	/** Recorded vs expected scores; shows a percentage and a thin bar. */
	progress?: { recorded: number; expected: number } | null;
};

type OptionsData = {
	classrooms?: RecordingFilterClassroom[];
	defaultDepartmentId?: string | null;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	triggerRef?: RefObject<HTMLButtonElement | null>;
	defaultExpanded?: RecordingFilterGroupKey;
	termId: string;
	departmentId: string;
	/** Applied subject selection. */
	subjectIds: string[];
	multiple: boolean;
	/** Omit (public link page) to hide the Term group. */
	terms?: RecordingFilterTerm[];
	/** Authorized classrooms for the applied term; empty hides the group. */
	classrooms?: RecordingFilterClassroom[];
	/** Subjects of the applied classroom, with live completion. */
	subjects: SubjectRailItem[];
	/** Term or classroom changed; the page loads the new scope. */
	onScopeChange?: (
		scope: {
			termId: string;
			departmentId: string | null;
		} & RecordingSubjectSelection,
	) => unknown;
	onSubjectsChange: (selection: RecordingSubjectSelection) => void;
};

export function termOptionLabel(term: RecordingFilterTerm) {
	return term.label || term.title || "Term";
}

export function classroomOptionLabel(classroom: RecordingFilterClassroom) {
	return classroom.displayName || classroom.departmentName || "Classroom";
}

/** Floors so a nearly finished classroom never reads as 100%. */
export function recordedPercent(progress: {
	recorded: number;
	expected: number;
}) {
	return progress.expected
		? Math.floor((progress.recorded / progress.expected) * 100)
		: 0;
}

function percentText(progress: { recorded: number; expected: number }) {
	const percent = recordedPercent(progress);
	return progress.recorded > 0 && percent === 0 ? "<1" : String(percent);
}

export function classroomProgressLabel(
	progress?: ClassroomRecordingProgress | null,
) {
	if (!progress) return undefined;
	const students = `${progress.students} student${progress.students === 1 ? "" : "s"}`;
	if (!progress.students) return students;
	if (!progress.expected) return `${students} · No assessment columns`;
	return `${students} · ${progress.recorded} recorded · ${progress.expected - progress.recorded} not recorded`;
}

function classroomChoice(
	classroom: RecordingFilterClassroom,
	progress = classroom.recordingProgress,
): Choice {
	return {
		value: classroom.id,
		label: classroomOptionLabel(classroom),
		subLabel: classroomProgressLabel(progress),
		progress: progress?.expected ? progress : null,
	};
}

function railSubjectChoice(subject: SubjectRailItem): Choice {
	return {
		value: subject.id,
		label: subject.title,
		subLabel: subject.hasAssessments
			? `${subject.completed}/${subject.total} complete`
			: "No assessment columns",
	};
}

function optionSubjectChoice(
	subject: RecordingSubjectOption,
	progress?: { recorded: number; expected: number } | null,
): Choice {
	if (!subject.assessments) {
		return {
			value: subject.id,
			label: subject.title,
			subLabel: "No assessment columns",
		};
	}
	const columns = `${subject.assessments} column${subject.assessments === 1 ? "" : "s"}`;
	return {
		value: subject.id,
		label: subject.title,
		subLabel: progress?.expected
			? `${columns} · ${progress.recorded} of ${progress.expected} scores recorded`
			: columns,
		progress: progress?.expected ? progress : null,
	};
}

/**
 * The classroom a draft term opens with when none was picked: the current
 * classroom if the term has it (classrooms belong to the session), else the
 * term's first classroom. Mirrors what the page does after applying.
 */
function resolveDraftDepartment({
	draftDepartmentId,
	currentDepartmentId,
	classrooms,
	defaultDepartmentId,
}: {
	draftDepartmentId: string | null;
	currentDepartmentId: string;
	classrooms: RecordingFilterClassroom[];
	defaultDepartmentId?: string | null;
}) {
	if (draftDepartmentId) return draftDepartmentId;
	if (classrooms.some((classroom) => classroom.id === currentDepartmentId)) {
		return currentDepartmentId;
	}
	return defaultDepartmentId ?? classrooms[0]?.id ?? null;
}

function sameIds(a: string[], b: string[]) {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Phone filter sheet for assessment recording: Term → Classroom → Subjects.
 * Edits stay in the shared sheet's draft until Apply. Subjects load for the
 * draft classroom straight from the cached filter options, so a new
 * classroom's subjects can be picked before applying.
 */
export function RecordingFilterSheet({
	open,
	onOpenChange,
	triggerRef,
	defaultExpanded,
	termId,
	departmentId,
	subjectIds,
	multiple: appliedMultiple,
	terms = [],
	classrooms = [],
	subjects,
	onScopeChange,
	onSubjectsChange,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const refreshFilter = useRefreshRecordingFilter();
	const showTerm = !!onScopeChange && terms.length > 0;
	const showClassroom = !!onScopeChange && classrooms.length > 0;
	const [multiple, setMultiple] = useState(appliedMultiple);

	// Each open starts from the applied mode, and re-counts classrooms whose
	// scores changed since the last open.
	useEffect(() => {
		if (!open) return;
		setMultiple(appliedMultiple);
		if (showClassroom) refreshFilter();
	}, [open, appliedMultiple, showClassroom, refreshFilter]);

	const cachedOptions = (draftTermId: string) =>
		draftTermId === termId
			? { classrooms, defaultDepartmentId: departmentId }
			: queryClient.getQueryData<OptionsData>(
					trpc.assessments.getRecordingContextOptions.queryKey({
						termId: draftTermId,
					}),
				);

	const cachedClassrooms = () => {
		const all = [...classrooms];
		for (const [, data] of queryClient.getQueriesData<OptionsData>({
			queryKey: trpc.assessments.getRecordingContextOptions.pathKey(),
		})) {
			all.push(...(data?.classrooms ?? []));
		}
		return all;
	};

	const classroomLabel = (id: string) => {
		const match = cachedClassrooms().find((classroom) => classroom.id === id);
		return match ? classroomOptionLabel(match) : "Classroom";
	};

	const subjectTitle = (id: string) =>
		subjects.find((subject) => subject.id === id)?.title ??
		cachedClassrooms()
			.flatMap((classroom) => classroom.subjects ?? [])
			.find((subject) => subject.id === id)?.title ??
		"Subject";

	// Reset returns each group to the applied selection.
	const groups: MobileFilterGroup[] = [
		...(showTerm
			? [
					{
						key: "termId",
						label: "Term",
						resetValue: termId,
						options: terms.flatMap((term) =>
							term.id ? [{ value: term.id, label: termOptionLabel(term) }] : [],
						),
					},
				]
			: []),
		...(showClassroom
			? [
					{
						key: "departmentId",
						label: "Classroom",
						resetValue: departmentId,
						options: classrooms.map((classroom) => classroomChoice(classroom)),
					},
				]
			: []),
		{
			key: "subjectIds",
			label: "Subjects",
			multiple: true,
			resetValue: subjectIds,
			options: subjects.map(railSubjectChoice),
		},
	];

	return (
		<MobileFilterSheet
			open={open}
			onOpenChange={onOpenChange}
			triggerRef={triggerRef}
			title={groups.length > 1 ? "Filters" : "Subjects"}
			defaultExpanded={defaultExpanded}
			values={{ termId, departmentId, subjectIds }}
			groups={groups}
			summary={(group, value) => {
				if (group.key === "termId") {
					const id = typeof value === "string" ? value : "";
					const term = terms.find((term) => term.id === id);
					return term ? termOptionLabel(term) : "Choose a term";
				}
				if (group.key === "departmentId") {
					const id = typeof value === "string" ? value : "";
					return id ? classroomLabel(id) : "Current classroom if available";
				}
				const ids = Array.isArray(value) ? (value as string[]) : [];
				if (!ids.length) return "First subject of the classroom";
				const titles = ids.map((id) => `⁨${subjectTitle(id)}⁩`);
				return ids.length === 1
					? titles[0]
					: `${ids.length} subjects · ${titles.join(", ")}`;
			}}
			renderGroup={(group, value, update, draft) => {
				const draftTermId = (draft.termId as string | null) ?? termId;
				const draftDepartmentId = draft.departmentId as string | null;

				if (group.key === "termId") {
					const selected = typeof value === "string" ? value : "";
					return (
						<RecordingChoices
							label="Term"
							options={group.options ?? []}
							values={[selected]}
							onToggle={(next) =>
								update({
									termId: next,
									...(next === termId
										? { departmentId, subjectIds }
										: { departmentId: null, subjectIds: [] }),
								})
							}
						/>
					);
				}

				if (group.key === "departmentId") {
					const onSelect = (next: string) =>
						update({
							departmentId: next,
							subjectIds:
								draftTermId === termId && next === departmentId
									? subjectIds
									: [],
						});
					return draftTermId === termId ? (
						<RecordingChoices
							label="Classroom"
							options={classrooms.map((classroom) =>
								classroomChoice(classroom),
							)}
							values={[draftDepartmentId ?? departmentId]}
							onToggle={onSelect}
						/>
					) : (
						<DraftTermClassrooms
							termId={draftTermId}
							currentDepartmentId={departmentId}
							value={draftDepartmentId}
							onSelect={onSelect}
						/>
					);
				}

				return (
					<SubjectChoices
						appliedTermId={termId}
						appliedDepartmentId={departmentId}
						appliedClassrooms={classrooms}
						appliedSubjects={subjects}
						draftTermId={draftTermId}
						draftDepartmentId={draftDepartmentId}
						values={Array.isArray(value) ? (value as string[]) : []}
						multiple={multiple}
						onMultipleChange={(next) => {
							setMultiple(next);
							const ids = Array.isArray(value) ? (value as string[]) : [];
							if (!next && ids.length > 1) {
								update({ subjectIds: ids.slice(0, 1) });
							}
						}}
						onChange={(ids) => update({ subjectIds: ids })}
					/>
				);
			}}
			onApply={(patch: FilterValues) => {
				const nextTermId = (patch.termId as string | null) || termId;
				const nextSubjectIds = Array.isArray(patch.subjectIds)
					? (patch.subjectIds as string[])
					: [];
				const selection = {
					subjectIds: multiple ? nextSubjectIds : nextSubjectIds.slice(0, 1),
					multiple,
				};
				const options = cachedOptions(nextTermId);
				const nextDepartmentId =
					nextTermId === termId
						? (patch.departmentId as string | null) || null
						: resolveDraftDepartment({
								draftDepartmentId:
									(patch.departmentId as string | null) || null,
								currentDepartmentId: departmentId,
								classrooms: options?.classrooms ?? [],
								defaultDepartmentId: options?.defaultDepartmentId,
							});
				if (
					nextTermId !== termId ||
					(nextDepartmentId && nextDepartmentId !== departmentId)
				) {
					return onScopeChange?.({
						termId: nextTermId,
						departmentId: nextDepartmentId,
						...selection,
					});
				}
				if (
					(selection.subjectIds.length &&
						!sameIds(selection.subjectIds, subjectIds)) ||
					multiple !== appliedMultiple
				) {
					onSubjectsChange({
						subjectIds: selection.subjectIds.length
							? selection.subjectIds
							: subjectIds.slice(0, multiple ? undefined : 1),
						multiple,
					});
				}
			}}
		/>
	);
}

/**
 * Subjects for the draft scope. The applied classroom uses the table's live
 * completion; any other classroom uses the cached filter options and the
 * cached progress counts, so nothing waits for an Apply.
 */
function SubjectChoices({
	appliedTermId,
	appliedDepartmentId,
	appliedClassrooms,
	appliedSubjects,
	draftTermId,
	draftDepartmentId,
	values,
	multiple,
	onMultipleChange,
	onChange,
}: {
	appliedTermId: string;
	appliedDepartmentId: string;
	appliedClassrooms: RecordingFilterClassroom[];
	appliedSubjects: SubjectRailItem[];
	draftTermId: string;
	draftDepartmentId: string | null;
	values: string[];
	multiple: boolean;
	onMultipleChange: (multiple: boolean) => void;
	onChange: (subjectIds: string[]) => void;
}) {
	const multipleSwitchId = useId();
	const sameTerm = draftTermId === appliedTermId;
	const draftTerm = useRecordingFilterOptions(draftTermId, {
		enabled: !sameTerm,
	});
	const termClassrooms: RecordingFilterClassroom[] = sameTerm
		? appliedClassrooms
		: ((draftTerm.data?.classrooms ?? []) as RecordingFilterClassroom[]);
	const resolvedDepartmentId = sameTerm
		? (draftDepartmentId ?? appliedDepartmentId)
		: resolveDraftDepartment({
				draftDepartmentId,
				currentDepartmentId: appliedDepartmentId,
				classrooms: termClassrooms,
				defaultDepartmentId: draftTerm.data?.defaultDepartmentId,
			});
	const isApplied = sameTerm && resolvedDepartmentId === appliedDepartmentId;
	const draftClassroom = termClassrooms.find(
		(classroom) => classroom.id === resolvedDepartmentId,
	);
	const { progress } = useRecordingProgress(
		draftTermId,
		termClassrooms.map((classroom) => classroom.id),
		{ enabled: !isApplied },
	);

	if (!isApplied && !sameTerm && draftTerm.isLoading) {
		return (
			<output className="block py-2 text-sm text-muted-foreground">
				Loading subjects…
			</output>
		);
	}

	const subjectProgress = resolvedDepartmentId
		? progress[resolvedDepartmentId]?.subjects
		: undefined;
	const options = isApplied
		? appliedSubjects.map(railSubjectChoice)
		: (draftClassroom?.subjects ?? []).map((subject) =>
				optionSubjectChoice(subject, subjectProgress?.[subject.id]),
			);

	return (
		<div className="space-y-2">
			{!isApplied && draftClassroom ? (
				<p className="text-xs text-muted-foreground">
					Subjects in <bdi>{classroomOptionLabel(draftClassroom)}</bdi>
				</p>
			) : null}
			{options.length > 1 ? (
				<div className="flex min-h-11 items-center justify-between gap-3 text-sm">
					<label htmlFor={multipleSwitchId} className="cursor-pointer">
						Select several subjects
					</label>
					<Switch
						id={multipleSwitchId}
						checked={multiple}
						onCheckedChange={onMultipleChange}
					/>
				</div>
			) : null}
			<RecordingChoices
				label="Subjects"
				options={options}
				values={values}
				multiple={multiple}
				emptyText="No subjects in this classroom."
				onToggle={(id) => {
					if (!multiple) return onChange([id]);
					if (!values.includes(id)) return onChange([...values, id]);
					const next = values.filter((value) => value !== id);
					// Keep one subject so the table always has columns.
					if (next.length) onChange(next);
				}}
			/>
		</div>
	);
}

/** Authorized classrooms for a term the user picked but has not applied yet. */
function DraftTermClassrooms({
	termId,
	currentDepartmentId,
	value,
	onSelect,
}: {
	termId: string;
	currentDepartmentId: string;
	value: string | null;
	onSelect: (classroomId: string) => void;
}) {
	const { data, isLoading, isError, refetch } =
		useRecordingFilterOptions(termId);
	const classrooms = (data?.classrooms ?? []) as RecordingFilterClassroom[];
	const { progress } = useRecordingProgress(
		termId,
		classrooms.map((classroom) => classroom.id),
	);

	if (isLoading) {
		return (
			<output className="block py-2 text-sm text-muted-foreground">
				Loading classrooms…
			</output>
		);
	}

	if (isError) {
		return (
			<div role="alert" className="space-y-2 py-2 text-sm text-destructive">
				<p>Could not load classrooms.</p>
				<Button
					type="button"
					variant="outline"
					className="min-h-11"
					onClick={() => {
						void refetch();
					}}
				>
					Retry
				</Button>
			</div>
		);
	}

	const resolved = resolveDraftDepartment({
		draftDepartmentId: value,
		currentDepartmentId,
		classrooms,
		defaultDepartmentId: data?.defaultDepartmentId,
	});

	return (
		<RecordingChoices
			label="Classroom"
			options={classrooms.map((classroom) =>
				classroomChoice(classroom, progress[classroom.id] ?? null),
			)}
			values={resolved ? [resolved] : []}
			emptyText="No classrooms are available for this term."
			onToggle={onSelect}
		/>
	);
}

/**
 * Choice list without a "clear" row: every group here is required. Radios
 * for one choice, checkboxes when several subjects can be picked.
 */
function RecordingChoices({
	label,
	options,
	values,
	onToggle,
	multiple = false,
	emptyText = "No options available.",
}: {
	label: string;
	options: Choice[];
	values: string[];
	onToggle: (value: string) => void;
	multiple?: boolean;
	emptyText?: string;
}) {
	const id = useId();

	if (!options.length) {
		return <p className="py-2 text-sm text-muted-foreground">{emptyText}</p>;
	}

	const rows = options.map((option, index) => {
		const optionId = `${id}-${index}`;
		const checked = values.includes(option.value);
		return (
			<label
				key={option.value}
				htmlFor={optionId}
				className={`flex min-h-11 cursor-pointer items-center gap-3 break-words rounded-md border px-3 py-2 text-sm ${checked ? "border-primary bg-accent" : "border-border"}`}
			>
				{multiple ? (
					<Checkbox
						id={optionId}
						checked={checked}
						onCheckedChange={() => onToggle(option.value)}
					/>
				) : (
					<RadioGroupItem id={optionId} value={option.value} />
				)}
				<span className="min-w-0 flex-1" dir="auto">
					{option.label}
					{option.subLabel ? (
						<span className="block text-xs tabular-nums text-muted-foreground">
							<bdi>{option.subLabel}</bdi>
						</span>
					) : null}
					{option.progress ? (
						<span
							aria-hidden="true"
							className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted"
						>
							<span
								className={`block h-full rounded-full ${recordedPercent(option.progress) >= 100 ? "bg-green-600" : "bg-primary"}`}
								style={{ width: `${recordedPercent(option.progress)}%` }}
							/>
						</span>
					) : null}
				</span>
				{option.progress ? (
					<span className="shrink-0 text-sm font-medium tabular-nums">
						{percentText(option.progress)}%
						<span className="sr-only"> recorded</span>
					</span>
				) : null}
			</label>
		);
	});

	return multiple ? (
		<fieldset className="grid gap-2">
			<legend className="sr-only">{label}</legend>
			{rows}
		</fieldset>
	) : (
		<RadioGroup
			aria-label={label}
			value={values[0] ?? ""}
			onValueChange={onToggle}
			className="gap-2"
		>
			{rows}
		</RadioGroup>
	);
}
