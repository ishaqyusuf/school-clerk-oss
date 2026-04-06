"use client";

import { updateStudentReportCookieByName } from "@/actions/cookies/student-report";
import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { studentDisplayName } from "@/utils/utils";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { Card, Table } from "@school-clerk/ui/composite";
import { Spinner } from "@school-clerk/ui/spinner";
import { Switch } from "@school-clerk/ui/switch";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { toast } from "@school-clerk/ui/use-toast";
import { sum } from "@school-clerk/utils";
import { useMutation } from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	BookOpenText,
	Check,
	FileSpreadsheet,
	Languages,
	Printer,
	Users,
} from "lucide-react";
import {
	Fragment,
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
  useTransition,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { _qc, _trpc } from "./static-trpc";

type SortColumn = "student" | "grandTotal";
type SortDirection = "asc" | "desc";
type SortState = { column: SortColumn; direction: SortDirection } | null;

function csvCell(value: string | number) {
	const text = String(value ?? "");
	if (/[",\n]/.test(text)) {
		return `"${text.replace(/"/g, '""')}"`;
	}
	return text;
}

function computeGrandTotal(
	studentId: string,
	subjects: Array<{
		assessments: Array<{
			obtainable: number;
			percentageObtainable: number | null;
			assessmentResults: Array<{
				obtained: number | null;
				studentTermFormId: string | null;
			}>;
		}>;
	}>,
) {
	let grandTotal = 0;
	for (const subject of subjects) {
		for (const assessment of subject.assessments) {
			const result = assessment.assessmentResults.find(
				(r) => r.studentTermFormId === studentId,
			);
			const obtained = result?.obtained ?? null;
			if (obtained !== null) {
				const percentageObtainable = assessment.percentageObtainable;
				const score =
					percentageObtainable && percentageObtainable !== assessment.obtainable
						? (obtained / assessment.obtainable) * percentageObtainable
						: obtained;
				grandTotal += score;
			}
		}
	}
	return grandTotal;
}

function SortIcon({ column, sort }: { column: SortColumn; sort: SortState }) {
	if (sort?.column !== column) {
		return <ArrowUpDown className="size-3 ml-1 inline opacity-50" />;
	}
	return sort.direction === "asc" ? (
		<ArrowUp className="size-3 ml-1 inline" />
	) : (
		<ArrowDown className="size-3 ml-1 inline" />
	);
}

export function ClassroomResultTable({
  defaultClassroomLayout,
}: {
  defaultClassroomLayout: "ltr" | "rtl";
}) {
	const ctx = useReportPageContext();
	const reportData = ctx.reportData;
	const { filters, setFilters } = useStudentReportFilterParams();
  const [, startSavingLayout] = useTransition();

	const allSubjects = reportData?.subjects ?? [];
	const students = reportData?.studentTermForms ?? [];

	const [sort, setSort] = useState<SortState>(null);
	const [totalsOnly, setTotalsOnly] = useState(false);
  const [classroomLayout, setClassroomLayout] = useState<"ltr" | "rtl">(
    defaultClassroomLayout,
  );
	const isRtl = classroomLayout === "rtl";
	const stickyEdgeClass = isRtl ? "right-0" : "left-0";
	const stickyIndexClass = isRtl ? "right-[40px]" : "left-[40px]";
	const stickyNameClass = isRtl ? "right-[80px]" : "left-[80px]";
	const dividerClass = isRtl ? "border-r" : "border-l";

  useEffect(() => {
    setClassroomLayout(defaultClassroomLayout);
  }, [defaultClassroomLayout]);

	const toggleSort = useCallback((column: SortColumn) => {
		setSort((prev) => {
			if (prev?.column !== column) return { column, direction: "asc" };
			if (prev.direction === "asc") return { column, direction: "desc" };
			return null;
		});
	}, []);

	// Hide assessment columns where no student has a valid (non-null) score,
	// and hide entire subject groups if all their assessments are hidden.
	const visibleSubjects = useMemo(() => {
		return allSubjects
			.map((subj) => ({
				...subj,
				assessments: subj.assessments.filter((asmt) =>
					asmt.assessmentResults.some((r) => r.obtained !== null),
				),
			}))
			.filter((subj) => subj.assessments.length > 0);
	}, [allSubjects]);

	const grandTotalsMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const student of students) {
			map.set(student.id, computeGrandTotal(student.id, visibleSubjects));
		}
		return map;
	}, [students, visibleSubjects]);

	const sortedStudents = useMemo(() => {
		if (!sort) return students;
		const sorted = [...students].sort((a, b) => {
			if (sort.column === "student") {
				const nameA = studentDisplayName(a.student).toLowerCase();
				const nameB = studentDisplayName(b.student).toLowerCase();
				return nameA.localeCompare(nameB);
			}
			return (grandTotalsMap.get(a.id) ?? 0) - (grandTotalsMap.get(b.id) ?? 0);
		});
		if (sort.direction === "desc") sorted.reverse();
		return sorted;
	}, [students, grandTotalsMap, sort]);

	const reportRows = useMemo(() => {
		const totalObtainable = visibleSubjects.reduce(
			(acc, subject) =>
				acc +
				sum(
					subject.assessments.map(
						(a) => a.percentageObtainable || a.obtainable,
					),
				),
			0,
		);
		return sortedStudents.map((student, index) => {
			const subjectTotals = visibleSubjects.map((subject) => {
				const assessmentScores = subject.assessments.map((assessment) => {
					const result = assessment.assessmentResults.find(
						(r) => r.studentTermFormId === student.id,
					);
					const obtained = result?.obtained ?? null;
					if (obtained === null) return null;
					const percentageObtainable = assessment.percentageObtainable;
					return percentageObtainable &&
						percentageObtainable !== assessment.obtainable
						? (obtained / assessment.obtainable) * percentageObtainable
						: obtained;
				});
				return {
					subject,
					assessmentScores,
					subjectTotal: assessmentScores.reduce(
						(acc, score) => acc + (score ?? 0),
						0,
					),
				};
			});

			const grandTotal = subjectTotals.reduce(
				(acc, item) => acc + item.subjectTotal,
				0,
			);
			const percentage =
				totalObtainable > 0
					? +((grandTotal / totalObtainable) * 100).toFixed(1)
					: 0;
			return {
				studentName: studentDisplayName(student.student),
				index,
				subjectTotals,
				grandTotal,
				percentage,
			};
		});
	}, [sortedStudents, visibleSubjects]);

	const totalAssessments = useMemo(
		() =>
			visibleSubjects.reduce(
				(count, subject) => count + subject.assessments.length,
				0,
			),
		[visibleSubjects],
	);

	const exportToExcel = useCallback(() => {
		if (!reportRows.length) return;
		const headers = ["S/N", "Student"];
		if (!totalsOnly) {
			for (const subject of visibleSubjects) {
				for (const assessment of subject.assessments) {
					headers.push(`${subject.subject.title} - ${assessment.title}`);
				}
				headers.push(`${subject.subject.title} Total`);
			}
		} else {
			for (const subject of visibleSubjects) {
				headers.push(`${subject.subject.title} Total`);
			}
		}
		headers.push("Grand Total", "Percentage");

		const lines = [
			headers.map(csvCell).join(","),
			...reportRows.map((row) => {
				const values: Array<string | number> = [row.index + 1, row.studentName];
				for (const subjectRow of row.subjectTotals) {
					if (!totalsOnly) {
						values.push(
							...subjectRow.assessmentScores.map((score) =>
								score != null ? score.toFixed(1) : "",
							),
						);
					}
					values.push(
						subjectRow.subjectTotal > 0
							? subjectRow.subjectTotal.toFixed(1)
							: "",
					);
				}
				values.push(
					row.grandTotal > 0 ? row.grandTotal.toFixed(1) : "",
					row.percentage > 0 ? `${row.percentage}%` : "",
				);
				return values.map(csvCell).join(",");
			}),
		];

		const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const classroomName =
			ctx.classroomName?.replace(/\s+/g, "-").toLowerCase() ?? "classroom";
		link.href = url;
		link.download = `${classroomName}-results-${totalsOnly ? "totals-only" : "full"}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		toast({
			title: "Spreadsheet export started",
			description: "Your browser should prompt you to download the CSV file.",
			variant: "success",
		});
	}, [ctx.classroomName, reportRows, totalsOnly, visibleSubjects]);

	const printSpreadsheet = useCallback(() => {
		if (!reportRows.length) return;
		const headers = [
			"<th>S/N</th>",
			"<th>Student</th>",
			...visibleSubjects.flatMap((subject) => {
				if (totalsOnly) return [`<th>${subject.subject.title} Total</th>`];
				return [
					...subject.assessments.map(
						(assessment) =>
							`<th>${subject.subject.title} - ${assessment.title}</th>`,
					),
					`<th>${subject.subject.title} Total</th>`,
				];
			}),
			"<th>Grand Total</th>",
			"<th>%</th>",
		];

		const rows = reportRows
			.map((row) => {
				const cells = [
					`<td>${row.index + 1}</td>`,
					`<td>${row.studentName}</td>`,
				];
				for (const subjectRow of row.subjectTotals) {
					if (!totalsOnly) {
						cells.push(
							...subjectRow.assessmentScores.map(
								(score) => `<td>${score != null ? score.toFixed(1) : "-"}</td>`,
							),
						);
					}
					cells.push(
						`<td>${subjectRow.subjectTotal > 0 ? subjectRow.subjectTotal.toFixed(1) : "-"}</td>`,
					);
				}
				cells.push(
					`<td>${row.grandTotal > 0 ? row.grandTotal.toFixed(1) : "-"}</td>`,
					`<td>${row.percentage > 0 ? `${row.percentage}%` : "-"}</td>`,
				);
				return `<tr>${cells.join("")}</tr>`;
			})
			.join("");

		const printWindow = window.open("", "_blank", "width=1200,height=800");
		if (!printWindow) {
			toast({
				title: "Unable to open print window",
				description:
					"Your browser may have blocked the pop-up. Please allow pop-ups for this site and try again.",
				variant: "destructive",
			});
			return;
		}
		printWindow.document.write(`
      <html>
        <head>
          <title>${ctx.classroomName ?? "Classroom"} Results</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h2 { margin-bottom: 10px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
            th { background: #f7f7f7; }
            td:nth-child(2), th:nth-child(2) { text-align: ${isRtl ? "right" : "left"}; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body dir="${isRtl ? "rtl" : "ltr"}">
          <h2>${ctx.classroomName ?? "Classroom"} Result Spreadsheet</h2>
          <table>
            <thead><tr>${headers.join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
	}, [ctx.classroomName, isRtl, reportRows, totalsOnly, visibleSubjects]);

	// Checkbox helpers — selections store the original (unsorted) index.
	// The map is computed once when students first load for a given departmentId
	// so that refetches (e.g. after score edits) or sort changes never shift indices.
	const stableIndexMapRef = useRef<Map<string, number>>(new Map());
	const lastDepartmentId = useRef<string | null>(null);
	const currentDeptId = filters.departmentId ?? null;
	if (students.length > 0 && currentDeptId !== lastDepartmentId.current) {
		lastDepartmentId.current = currentDeptId;
		const map = new Map<string, number>();
		students.forEach((s, i) => map.set(s.id, i));
		stableIndexMapRef.current = map;
	}
	const originalIndexMap = stableIndexMapRef.current;

	const selections = filters.selections ?? [];
	const allSelected =
		students.length > 0 &&
		students.every((s) => {
			const originalIndex = originalIndexMap.get(s.id);
			return originalIndex != null && selections.includes(originalIndex);
		});
	const someSelected = !allSelected && selections.length > 0;

	const toggleAll = useCallback(() => {
		if (allSelected) {
			setFilters({ selections: [] });
		} else {
			setFilters({ selections: students.map((_, i) => i) });
		}
	}, [allSelected, students, setFilters]);

	const toggleStudent = useCallback(
		(originalIndex: number) => {
			const next = [...selections, originalIndex];
			setFilters({
				selections: next.filter(
					(a) => next.filter((b) => b === a).length === 1,
				),
			});
		},
		[selections, setFilters],
	);

	if (!visibleSubjects.length || !students.length) {
		return (
			<div className="flex items-center justify-center py-12 text-muted-foreground">
				No result data available. Select a classroom with assessment records.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<Card className="overflow-hidden border-border/70 shadow-sm">
				<Card.Header className="gap-5 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20 p-4 sm:p-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-3">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="rounded-full px-3 py-1">
									Classroom Results
								</Badge>
								{ctx.classroomName ? (
									<Badge variant="outline" className="rounded-full px-3 py-1">
										{ctx.classroomName}
									</Badge>
								) : null}
							</div>
							<div className="space-y-1">
								<Card.Title className="mb-0 text-xl sm:text-2xl">
									Review scores, sort quickly, and print with confidence
								</Card.Title>
								<Card.Description className="max-w-2xl text-sm leading-6">
									Switch between left-to-right and right-to-left layouts,
									collapse to subject totals when needed, and export the current
									classroom grid for printing or spreadsheets.
								</Card.Description>
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge
									variant="outline"
									className="gap-1.5 rounded-full px-3 py-1"
								>
									<Users className="size-3.5" />
									{students.length} students
								</Badge>
								<Badge
									variant="outline"
									className="gap-1.5 rounded-full px-3 py-1"
								>
									<BookOpenText className="size-3.5" />
									{visibleSubjects.length} subjects
								</Badge>
								<Badge
									variant="outline"
									className="gap-1.5 rounded-full px-3 py-1"
								>
									<FileSpreadsheet className="size-3.5" />
									{totalsOnly ? visibleSubjects.length : totalAssessments}{" "}
									visible columns
								</Badge>
							</div>
						</div>
						<div className="grid gap-3 sm:min-w-[320px]">
							<div className="rounded-2xl border bg-background/90 p-3 shadow-sm">
								<div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
									<Languages className="size-3.5" />
									Layout Direction
								</div>
								<ToggleGroup
									type="single"
									value={classroomLayout}
									onValueChange={(value) => {
										if (!value) return;
                    const nextLayout = value as "ltr" | "rtl";
                    setClassroomLayout(nextLayout);
                    startSavingLayout(() => {
                      updateStudentReportCookieByName(
                        "classroomLayout",
                        nextLayout,
                      );
                    });
									}}
									variant="outline"
									className="grid w-full grid-cols-2"
								>
									<ToggleGroupItem value="ltr" className="justify-center">
										Left to right
									</ToggleGroupItem>
									<ToggleGroupItem value="rtl" className="justify-center">
										Right to left
									</ToggleGroupItem>
								</ToggleGroup>
							</div>
							<div className="flex flex-col gap-3 rounded-2xl border bg-background/90 p-3 shadow-sm">
								<div className="flex items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2">
									<div className="space-y-0.5">
										<p className="text-sm font-medium">Totals-only mode</p>
										<p className="text-xs text-muted-foreground">
											Hide assessment columns and keep subject totals visible.
										</p>
									</div>
									<Switch
										checked={totalsOnly}
										onCheckedChange={setTotalsOnly}
									/>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										size="sm"
										className="flex-1 gap-2"
										onClick={printSpreadsheet}
									>
										<Printer className="size-4" />
										Print Spreadsheet
									</Button>
									<Button
										size="sm"
										className="flex-1 gap-2"
										onClick={exportToExcel}
									>
										<FileSpreadsheet className="size-4" />
										Export Excel
									</Button>
								</div>
							</div>
						</div>
					</div>
				</Card.Header>
				<Card.Content className="p-0">
					<div className="overflow-auto max-h-[calc(100vh-250px)]">
						<Table dir={isRtl ? "rtl" : "ltr"}>
							<TableHeader className="sticky top-0 z-20">
								<TableRow>
									<TableHead
										rowSpan={2}
										className={cn(
											"sticky z-30 bg-background min-w-[40px] text-center",
											stickyEdgeClass,
											isRtl ? "border-l" : "border-r",
										)}
									>
										<Checkbox
											checked={
												allSelected
													? true
													: someSelected
														? "indeterminate"
														: false
											}
											onCheckedChange={toggleAll}
											aria-label="Select all students"
										/>
									</TableHead>
									<TableHead
										rowSpan={2}
										className={cn(
											"sticky z-30 bg-background min-w-[40px] text-center",
											stickyIndexClass,
											isRtl ? "border-l" : "border-r",
										)}
									>
										#
									</TableHead>
									<TableHead
										rowSpan={2}
										className={cn(
											"sticky z-30 bg-background min-w-[160px] cursor-pointer select-none whitespace-nowrap",
											stickyNameClass,
											isRtl ? "border-l text-right" : "border-r text-left",
										)}
										dir={isRtl ? "rtl" : "ltr"}
										onClick={() => toggleSort("student")}
									>
										<span className="inline-flex items-center">
											Student
											<SortIcon column="student" sort={sort} />
										</span>
									</TableHead>
									{visibleSubjects.map((subject) => (
										<TableHead
											key={subject.id}
											colSpan={totalsOnly ? 1 : subject.assessments.length + 1}
											className={cn(
												"text-center font-semibold bg-background",
												dividerClass,
											)}
											dir={isRtl ? "rtl" : "ltr"}
										>
											{subject.subject.title}
										</TableHead>
									))}
									<TableHead
										rowSpan={2}
										className={cn(
											"text-center font-semibold min-w-[60px] cursor-pointer select-none bg-background",
											dividerClass,
										)}
										onClick={() => toggleSort("grandTotal")}
									>
										<span className="inline-flex items-center justify-center">
											Total
											<SortIcon column="grandTotal" sort={sort} />
										</span>
									</TableHead>
									<TableHead
										rowSpan={2}
										className={cn(
											"text-center font-semibold min-w-[50px] bg-background",
											dividerClass,
										)}
									>
										%
									</TableHead>
								</TableRow>
								<TableRow>
									{visibleSubjects.map((subject) => (
										<Fragment key={subject.id}>
											{!totalsOnly &&
												subject.assessments.map((assessment) => (
													<TableHead
														key={`${subject.id}-${assessment.id}`}
														className={cn(
															"text-center text-xs min-w-[70px] bg-background",
															dividerClass,
														)}
													>
														<div>{assessment.title}</div>
														<div className="text-muted-foreground">
															({assessment.obtainable})
														</div>
													</TableHead>
												))}
											<Table.Head
												className={cn(
													"text-center text-xs font-semibold min-w-[60px] bg-background",
													dividerClass,
												)}
											>
												Total
											</Table.Head>
										</Fragment>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedStudents.map((student, si) => {
									const originalIndex = originalIndexMap.get(student.id) ?? si;
									return (
										<StudentResultRow
											key={student.id}
											student={student}
											subjects={visibleSubjects}
											showAssessments={!totalsOnly}
											index={si}
											originalIndex={originalIndex}
											isSelected={selections.includes(originalIndex)}
											onToggle={toggleStudent}
											isRtl={isRtl}
											dividerClass={dividerClass}
										/>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</Card.Content>
			</Card>
		</div>
	);
}

interface StudentResultRowProps {
	student: {
		id: string;
		student: {
			id: string;
			gender: string | null;
			name: string | null;
			otherName: string | null;
			surname: string | null;
		} | null;
	};
	subjects: Array<{
		id: string;
		assessments: Array<{
			id: number;
			title: string;
			obtainable: number;
			percentageObtainable: number | null;
			index: number | null;
			assessmentResults: Array<{
				id: number;
				obtained: number | null;
				percentageScore: number | null;
				studentTermFormId: string | null;
				studentId: string | null;
			}>;
		}>;
		subject: { title: string };
	}>;
	showAssessments: boolean;
	index: number;
	originalIndex: number;
	isSelected: boolean;
	onToggle: (originalIndex: number) => void;
	isRtl: boolean;
	dividerClass: string;
}

function StudentResultRow({
	student,
	subjects,
	showAssessments,
	index,
	originalIndex,
	isSelected,
	onToggle,
	isRtl,
	dividerClass,
}: StudentResultRowProps) {
	const subjectTotals = useMemo(() => {
		return subjects.map((subject) => {
			let subjectTotal = 0;
			const assessmentScores = subject.assessments.map((assessment) => {
				const result = assessment.assessmentResults.find(
					(r) => r.studentTermFormId === student.id,
				);
				const obtained = result?.obtained ?? null;
				if (obtained !== null) {
					const percentageObtainable = assessment.percentageObtainable;
					const score =
						percentageObtainable &&
						percentageObtainable !== assessment.obtainable
							? (obtained / assessment.obtainable) * percentageObtainable
							: obtained;
					subjectTotal += score;
				}
				return { obtained, result };
			});
			return { subjectTotal, assessmentScores };
		});
	}, [subjects, student.id]);

	let grandTotal = 0;
	for (const subjectTotal of subjectTotals) {
		grandTotal += subjectTotal.subjectTotal;
	}

	const totalObtainable = subjects.reduce(
		(acc, subject) =>
			acc +
			sum(
				subject.assessments.map((a) => a.percentageObtainable || a.obtainable),
			),
		0,
	);

	const percentage =
		totalObtainable > 0
			? +((grandTotal / totalObtainable) * 100).toFixed(1)
			: 0;

	return (
		<TableRow
			data-selected={isSelected || undefined}
			className={cn(isSelected && "bg-accent/40")}
		>
			<TableCell
				className={cn(
					"sticky z-10 bg-background text-center",
					isRtl ? "right-0 border-l" : "left-0 border-r",
				)}
			>
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onToggle(originalIndex)}
					aria-label="Select student"
				/>
			</TableCell>
			<TableCell
				className={cn(
					"sticky z-10 bg-background text-center text-muted-foreground text-sm",
					isRtl ? "right-[40px] border-l" : "left-[40px] border-r",
				)}
			>
				{index + 1}
			</TableCell>
			<TableCell
				className={cn(
					"sticky z-10 bg-background whitespace-nowrap",
					isRtl
						? "right-[80px] border-l text-right"
						: "left-[80px] border-r text-left",
				)}
				dir={isRtl ? "rtl" : "ltr"}
			>
				{studentDisplayName(student.student)}
			</TableCell>
			{subjects.map((subject, si) => {
				const { subjectTotal, assessmentScores } = subjectTotals[si];
				return (
					<Fragment key={subject.id}>
						{showAssessments &&
							subject.assessments.map((assessment, ai) => {
								const { result } = assessmentScores[ai];
								return (
									<ScoreCell
										key={`${student.id}-${assessment.id}`}
										assessmentId={assessment.id}
										obtainable={assessment.obtainable}
										studentTermFormId={student.id}
										studentId={student.student?.id}
										departmentSubjectId={subject.id}
										result={result}
										dividerClass={dividerClass}
									/>
								);
							})}
						<TableCell
							className={cn("text-center font-medium text-sm", dividerClass)}
						>
							{subjectTotal > 0 ? subjectTotal.toFixed(1) : "-"}
						</TableCell>
					</Fragment>
				);
			})}
			<TableCell className={cn("text-center font-semibold", dividerClass)}>
				{grandTotal > 0 ? grandTotal.toFixed(1) : "-"}
			</TableCell>
			<TableCell className={cn("text-center font-semibold", dividerClass)}>
				{percentage > 0 ? `${percentage}%` : "-"}
			</TableCell>
		</TableRow>
	);
}

interface ScoreCellProps {
	assessmentId: number;
	obtainable: number;
	studentTermFormId: string;
	studentId: string | undefined;
	departmentSubjectId: string;
	dividerClass: string;
	result:
		| {
				id: number;
				obtained: number | null;
				percentageScore: number | null;
				studentTermFormId: string | null;
				studentId: string | null;
		  }
		| null
		| undefined;
}

function ScoreCell({
	assessmentId,
	obtainable,
	studentTermFormId,
	studentId,
	departmentSubjectId,
	dividerClass,
	result,
}: ScoreCellProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [localValue, setLocalValue] = useState<string>(
		result?.obtained != null ? String(result.obtained) : "",
	);
	const displayValue = useDeferredValue(localValue);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isEditing) return;
		inputRef.current?.focus();
		inputRef.current?.select();
	}, [isEditing]);

	const { isPending, mutate, isSuccess, error, reset } = useMutation(
		_trpc.assessments.updateAssessmentScore.mutationOptions({
			onSuccess(data) {
				setLocalValue(data.obtained != null ? String(data.obtained) : "");
				_qc.invalidateQueries({
					queryKey: _trpc.assessments.getClassroomReportSheet.queryKey({}),
				});
				setTimeout(() => {
					reset();
				}, 1500);
			},
		}),
	);

	const handleSave = useDebouncedCallback((value: string) => {
		const numValue = value ? +value : null;
		mutate({
			id: result?.id,
			obtained: numValue,
			assessmentId,
			studentTermId: studentTermFormId,
			studentId: studentId ?? "",
			departmentId: departmentSubjectId,
		});
	}, 600);

	if (!isEditing) {
		return (
			<TableCell
				className={cn(
					"text-center cursor-pointer hover:bg-accent/50 transition-colors min-w-[70px] p-0",
					dividerClass,
				)}
				onClick={() => setIsEditing(true)}
			>
				<div className="flex items-center justify-center h-full py-2 px-1">
					<span
						className={cn(
							"text-sm",
							result?.obtained == null && "text-muted-foreground",
						)}
					>
						{result?.obtained != null ? result.obtained : "-"}
					</span>
				</div>
			</TableCell>
		);
	}

	return (
		<TableCell className={cn("text-center p-0 min-w-[70px]", dividerClass)}>
			<div className="flex items-center gap-1">
				<input
					ref={inputRef}
					type="number"
					className={cn(
						"w-full h-8 text-center text-sm bg-transparent border-0 outline-none",
						"focus:ring-1 focus:ring-primary rounded",
						"[appearance:textfield]",
						"[&::-webkit-inner-spin-button]:appearance-none",
						"[&::-webkit-outer-spin-button]:appearance-none",
						+displayValue > obtainable && "text-destructive",
					)}
					defaultValue={displayValue}
					onBlur={() => {
						setTimeout(() => setIsEditing(false), 200);
					}}
					onChange={(e) => {
						setLocalValue(e.target.value);
						handleSave(e.target.value);
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setIsEditing(false);
						}
					}}
					placeholder="-"
				/>
				<div className="w-4 mr-1">
					{isPending ? (
						<Spinner className="size-3" />
					) : error ? (
						<AlertCircle className="text-destructive size-3" />
					) : isSuccess ? (
						<Check className="text-green-500 size-3" />
					) : null}
				</div>
			</div>
		</TableCell>
	);
}
