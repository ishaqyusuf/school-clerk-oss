"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { RadioGroup, RadioGroupItem } from "@school-clerk/ui/radio-group";
import {
	type FilterValues,
	type MobileFilterGroup,
	MobileFilterSheet,
} from "@school-clerk/ui/search-filter/mobile-filter-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type RefObject, useId } from "react";
import type { SubjectRailItem } from "./subject-rail";

export type RecordingFilterTerm = {
	/** Optional in the API output type; terms without an id are skipped. */
	id?: string | null;
	label?: string | null;
	title?: string | null;
};

export type RecordingFilterClassroom = {
	id: string;
	displayName?: string | null;
	departmentName?: string | null;
};

export type RecordingFilterGroupKey = "termId" | "departmentId" | "subjectId";

type Choice = { value: string; label: string; subLabel?: string };

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	triggerRef?: RefObject<HTMLButtonElement | null>;
	defaultExpanded?: RecordingFilterGroupKey;
	termId: string;
	departmentId: string;
	subjectId: string | null;
	/** Omit (public link page) to hide the Term group. */
	terms?: RecordingFilterTerm[];
	/** Authorized classrooms for the applied term; empty hides the group. */
	classrooms?: RecordingFilterClassroom[];
	subjects: SubjectRailItem[];
	/** Term or classroom changed; the page loads the new scope's first subject. */
	onScopeChange?: (scope: {
		termId: string;
		departmentId: string | null;
	}) => unknown;
	onSubjectChange: (subjectId: string) => void;
};

export function termOptionLabel(term: RecordingFilterTerm) {
	return term.label || term.title || "Term";
}

export function classroomOptionLabel(classroom: RecordingFilterClassroom) {
	return classroom.displayName || classroom.departmentName || "Classroom";
}

function subjectSubLabel(subject: SubjectRailItem) {
	return subject.hasAssessments
		? `${subject.completed}/${subject.total} complete`
		: "No assessment columns";
}

/**
 * Phone filter sheet for assessment recording: Term → Classroom → Subject.
 * Edits stay in the shared sheet's draft until Apply. Term and classroom
 * changes go through the page's URL filters; a subject change alone only
 * switches the workspace's selected subject.
 */
export function RecordingFilterSheet({
	open,
	onOpenChange,
	triggerRef,
	defaultExpanded,
	termId,
	departmentId,
	subjectId,
	terms = [],
	classrooms = [],
	subjects,
	onScopeChange,
	onSubjectChange,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const showTerm = !!onScopeChange && terms.length > 0;
	const showClassroom = !!onScopeChange && classrooms.length > 0;

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
						options: classrooms.map((classroom) => ({
							value: classroom.id,
							label: classroomOptionLabel(classroom),
						})),
					},
				]
			: []),
		{
			key: "subjectId",
			label: "Subject",
			resetValue: subjectId,
			options: subjects.map((subject) => ({
				value: subject.id,
				label: subject.title,
				subLabel: subjectSubLabel(subject),
			})),
		},
	];

	const classroomLabel = (id: string) => {
		const current = classrooms.find((classroom) => classroom.id === id);
		if (current) return classroomOptionLabel(current);
		// Classrooms loaded for a draft term live in the context query cache.
		for (const [, data] of queryClient.getQueriesData<{
			classrooms?: RecordingFilterClassroom[];
		}>({ queryKey: trpc.assessments.getRecordingContextOptions.pathKey() })) {
			const match = data?.classrooms?.find((classroom) => classroom.id === id);
			if (match) return classroomOptionLabel(match);
		}
		return "Classroom";
	};

	return (
		<MobileFilterSheet
			open={open}
			onOpenChange={onOpenChange}
			triggerRef={triggerRef}
			title={groups.length > 1 ? "Filters" : "Subject"}
			defaultExpanded={defaultExpanded}
			values={{ termId, departmentId, subjectId }}
			groups={groups}
			summary={(group, value) => {
				const id = typeof value === "string" ? value : "";
				if (group.key === "termId") {
					const term = terms.find((term) => term.id === id);
					return term ? termOptionLabel(term) : "Choose a term";
				}
				if (group.key === "departmentId") {
					return id ? classroomLabel(id) : "Current classroom if available";
				}
				const subject = subjects.find((subject) => subject.id === id);
				return subject
					? `⁨${subject.title}⁩ · ${subject.hasAssessments ? `${subject.completed}/${subject.total}` : "–"}`
					: "First subject opens after applying";
			}}
			renderGroup={(group, value, update, draft) => {
				const selected = typeof value === "string" ? value : "";
				const draftTermId = (draft.termId as string | null) ?? termId;
				const draftDepartmentId = draft.departmentId as string | null;

				if (group.key === "termId") {
					return (
						<RecordingChoices
							label="Term"
							options={group.options ?? []}
							value={selected}
							onSelect={(next) =>
								update({
									termId: next,
									...(next === termId
										? { departmentId, subjectId }
										: { departmentId: null, subjectId: null }),
								})
							}
						/>
					);
				}

				if (group.key === "departmentId") {
					const onSelect = (next: string) =>
						update({
							departmentId: next,
							subjectId:
								draftTermId === termId && next === departmentId
									? subjectId
									: null,
						});
					return draftTermId === termId ? (
						<RecordingChoices
							label="Classroom"
							options={group.options ?? []}
							value={selected}
							onSelect={onSelect}
						/>
					) : (
						<DraftTermClassrooms
							termId={draftTermId}
							value={selected}
							onSelect={onSelect}
						/>
					);
				}

				if (draftTermId !== termId || draftDepartmentId !== departmentId) {
					return (
						<p className="py-2 text-sm text-muted-foreground">
							The first subject of the new{" "}
							{draftTermId !== termId ? "term" : "classroom"} opens after you
							apply. Switch subjects from the subject bar afterwards.
						</p>
					);
				}

				return (
					<RecordingChoices
						label="Subject"
						options={group.options ?? []}
						value={selected}
						emptyText="No subjects in this classroom."
						onSelect={(next) => update({ subjectId: next })}
					/>
				);
			}}
			onApply={(patch: FilterValues) => {
				const nextTermId = (patch.termId as string | null) || termId;
				const nextDepartmentId = (patch.departmentId as string | null) || null;
				if (
					nextTermId !== termId ||
					(nextDepartmentId && nextDepartmentId !== departmentId)
				) {
					return onScopeChange?.({
						termId: nextTermId,
						departmentId: nextDepartmentId,
					});
				}
				const nextSubjectId = patch.subjectId as string | null;
				if (nextSubjectId && nextSubjectId !== subjectId) {
					onSubjectChange(nextSubjectId);
				}
			}}
		/>
	);
}

/** Authorized classrooms for a term the user picked but has not applied yet. */
function DraftTermClassrooms({
	termId,
	value,
	onSelect,
}: {
	termId: string;
	value: string;
	onSelect: (classroomId: string) => void;
}) {
	const trpc = useTRPC();
	const { data, isLoading, isError, refetch } = useQuery(
		trpc.assessments.getRecordingContextOptions.queryOptions({ termId }),
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

	return (
		<RecordingChoices
			label="Classroom"
			options={(data?.classrooms ?? []).map((classroom) => ({
				value: classroom.id,
				label: classroomOptionLabel(classroom as RecordingFilterClassroom),
			}))}
			value={value}
			emptyText="No classrooms are available for this term."
			onSelect={onSelect}
		/>
	);
}

/** Single-choice list without a "clear" row: every group here is required. */
function RecordingChoices({
	label,
	options,
	value,
	onSelect,
	emptyText = "No options available.",
}: {
	label: string;
	options: Choice[];
	value: string;
	onSelect: (value: string) => void;
	emptyText?: string;
}) {
	const id = useId();

	if (!options.length) {
		return <p className="py-2 text-sm text-muted-foreground">{emptyText}</p>;
	}

	return (
		<RadioGroup
			aria-label={label}
			value={value}
			onValueChange={onSelect}
			className="gap-2"
		>
			{options.map((option, index) => {
				const optionId = `${id}-${index}`;
				const checked = option.value === value;
				return (
					<label
						key={option.value}
						htmlFor={optionId}
						className={`flex min-h-11 cursor-pointer items-center gap-3 break-words rounded-md border px-3 py-2 text-sm ${checked ? "border-primary bg-accent" : "border-border"}`}
					>
						<RadioGroupItem id={optionId} value={option.value} />
						<span className="min-w-0 flex-1" dir="auto">
							{option.label}
							{option.subLabel ? (
								<span className="block text-xs tabular-nums text-muted-foreground">
									<bdi>{option.subLabel}</bdi>
								</span>
							) : null}
						</span>
					</label>
				);
			})}
		</RadioGroup>
	);
}
