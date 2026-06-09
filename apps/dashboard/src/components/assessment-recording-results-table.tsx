"use client";

import { AssessmentResultsScoreCell } from "@/components/assessment-results-score-cell";
import { SubjectAssessments } from "@/components/subject-assessments";
import {
	buildResultRows,
	filterResultStudents,
	filterResultSubjects,
	getStudentDisplayName,
} from "@school-clerk/assessment-results";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Dialog, DropdownMenu } from "@school-clerk/ui/composite";
import { Input } from "@school-clerk/ui/input";
import { Spinner } from "@school-clerk/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Search, X } from "lucide-react";
import { Fragment, useDeferredValue, useEffect, useMemo, useState } from "react";
import { _trpc } from "./static-trpc";

type Props = {
	departmentId: string;
	termId: string;
	selectedSubjectId?: string | null;
};

export function AssessmentRecordingResultsTable({
	departmentId,
	termId,
	selectedSubjectId,
}: Props) {
	const [subjectFilterIds, setSubjectFilterIds] = useState<string[]>([]);
	const [nameSearch, setNameSearch] = useState("");
	const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
	const deferredNameSearch = useDeferredValue(nameSearch);

	const { data, isLoading } = useQuery(
		_trpc.assessments.getClassroomReportSheet.queryOptions(
			{
				departmentId,
				sessionTermId: termId,
			},
			{
				enabled: !!departmentId && !!termId,
			},
		),
	);

	useEffect(() => {
		setSubjectFilterIds(selectedSubjectId ? [selectedSubjectId] : []);
	}, [selectedSubjectId]);

	const allSubjects = data?.subjects ?? [];
	const visibleSubjects = useMemo(
		() =>
			filterResultSubjects({
				subjects: allSubjects,
				selectedSubjectIds: subjectFilterIds,
			}),
		[allSubjects, subjectFilterIds],
	);
	const filteredStudents = useMemo(
		() =>
			filterResultStudents({
				students: data?.studentTermForms ?? [],
				search: deferredNameSearch,
			}),
		[data?.studentTermForms, deferredNameSearch],
	);
	const resultRows = useMemo(
		() =>
			buildResultRows({
				subjects: visibleSubjects,
				students: filteredStudents,
			}),
		[filteredStudents, visibleSubjects],
	);

	const openSubjectOverview = useQuery(
		_trpc.subjects.overview.queryOptions(
			{
				departmentSubjectId: openSubjectId ?? "",
			},
			{
				enabled: !!openSubjectId,
			},
		),
	);

	const subjectFilterLabel = subjectFilterIds.length
		? `${subjectFilterIds.length} selected`
		: "All subjects";

	if (isLoading) {
		return (
			<div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
				<Spinner size={16} />
				Loading students...
			</div>
		);
	}

	if (!data?.studentTermForms?.length) {
		return (
			<div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
				No students found for this classroom in the selected term.
			</div>
		);
	}

	return (
		<>
			<div className="rounded-lg border bg-background">
				<div className="flex flex-col gap-3 border-b p-3 md:flex-row md:items-center md:justify-between">
					<div className="relative w-full md:max-w-xs">
						<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={nameSearch}
							onChange={(event) => setNameSearch(event.target.value)}
							placeholder="Search student name"
							className="pl-9 pr-9"
						/>
						{nameSearch ? (
							<button
								type="button"
								onClick={() => setNameSearch("")}
								className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
							>
								<X className="size-4" />
							</button>
						) : null}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
							{filteredStudents.length}/{data.studentTermForms.length} students
						</Badge>
						<DropdownMenu>
							<DropdownMenu.Trigger asChild>
								<Button variant="outline" className="gap-2">
									<BookOpenText className="size-4" />
									{subjectFilterLabel}
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" className="w-64">
								<DropdownMenu.Item
									onSelect={() =>
										setSubjectFilterIds(allSubjects.map((subject) => subject.id))
									}
								>
									Select all
								</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={() => setSubjectFilterIds([])}>
									Clear selection
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								{allSubjects.map((subject) => (
									<DropdownMenu.CheckboxItem
										key={subject.id}
										checked={subjectFilterIds.includes(subject.id)}
										onSelect={(event) => event.preventDefault()}
										onCheckedChange={(value) => {
											setSubjectFilterIds((current) =>
												value
													? [...current, subject.id]
													: current.filter((id) => id !== subject.id),
											);
										}}
									>
										{subject.subject.title}
									</DropdownMenu.CheckboxItem>
								))}
							</DropdownMenu.Content>
						</DropdownMenu>
					</div>
				</div>
				<div className="max-h-[calc(100vh-180px)] overflow-auto">
					<Table dir="rtl">
						<TableHeader className="sticky top-0 z-10 bg-background">
							<TableRow>
								<TableHead rowSpan={2} className="sticky right-0 z-20 bg-background">
									Student
								</TableHead>
								{visibleSubjects.map((subject) => (
									<TableHead
										key={subject.id}
										colSpan={subject.assessments.length + 1}
										className="text-center"
									>
										<button
											type="button"
											onClick={() => setOpenSubjectId(subject.id)}
											className="font-semibold underline-offset-4 hover:underline"
										>
											{subject.subject.title}
										</button>
									</TableHead>
								))}
							</TableRow>
							<TableRow>
								{visibleSubjects.map((subject) => (
									<Fragment key={subject.id}>
										{subject.assessments.map((assessment) => (
											<TableHead
												key={`${subject.id}-${assessment.id}`}
												className="min-w-[70px] text-center text-xs"
											>
												<div>{assessment.title}</div>
												<div className="text-muted-foreground">
													({assessment.obtainable})
												</div>
											</TableHead>
										))}
										<TableHead className="min-w-[70px] text-center text-xs">
											Total
										</TableHead>
									</Fragment>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{resultRows.length ? (
								resultRows.map((row, index) => (
									<TableRow key={row.student.id}>
										<TableCell className="sticky right-0 z-10 whitespace-nowrap bg-background">
											{index + 1}. {getStudentDisplayName(row.student.student)}
										</TableCell>
										{row.subjectTotals.map((subjectTotal) => (
											<Fragment key={subjectTotal.subject.id}>
												{subjectTotal.cells.map((cell) => (
													<AssessmentResultsScoreCell
														key={`${row.student.id}-${cell.assessment.id}`}
														assessmentId={cell.assessment.id}
														obtainable={cell.assessment.obtainable}
														studentTermFormId={row.student.id}
														studentId={row.student.student?.id}
														departmentSubjectId={subjectTotal.subject.id}
														result={cell.result}
													/>
												))}
												<TableCell className="text-center font-medium">
													{subjectTotal.total > 0
														? subjectTotal.total.toFixed(1)
														: "-"}
												</TableCell>
											</Fragment>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={
											1 +
											visibleSubjects.reduce(
												(total, subject) =>
													total + subject.assessments.length + 1,
												0,
											)
										}
										className="h-24 text-center text-muted-foreground"
									>
										No students match the current filters.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
			<Dialog.Root
				open={!!openSubjectId}
				onOpenChange={(open) => {
					if (!open) setOpenSubjectId(null);
				}}
			>
				<Dialog.Content className="max-h-[90vh] max-w-5xl overflow-auto">
					<Dialog.Header>
						<Dialog.Title>Subject assessments</Dialog.Title>
						<Dialog.Description>
							Add or edit the assessment columns shown in this table.
						</Dialog.Description>
					</Dialog.Header>
					{openSubjectOverview.data ? (
						<SubjectAssessments overview={openSubjectOverview.data} />
					) : (
						<div className="flex h-32 items-center justify-center">
							<Spinner size={16} />
						</div>
					)}
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
}
