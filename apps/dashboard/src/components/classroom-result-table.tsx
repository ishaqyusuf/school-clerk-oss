"use client";

import { updateStudentReportCookieByName } from "@/actions/cookies/student-report";
import { AssessmentResultsScoreCell } from "@/components/assessment-results-score-cell";
import { SearchFilter } from "@/components/midday-search-filter/search-filter-md";
import { SubjectAssessments } from "@/components/subject-assessments";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useReportPageContext } from "@/hooks/use-report-page";
import {
	studentReportSearchFilterParams,
	useStudentReportFilterParams,
} from "@/hooks/use-student-report-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useAuth } from "@/hooks/use-auth";
import { configs } from "@/configs";
import type { PageFilterData } from "@/types";
import {
	buildResultRows,
	filterResultStudents,
	filterResultSubjects,
	getAssessmentDisplayTitle,
	getDuplicateStudentNameKeys,
	getStudentDisplayName,
	getStudentSearchKey,
	type ResultRow,
} from "@school-clerk/assessment-results";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { Card, Dialog } from "@school-clerk/ui/composite";
import { Spinner } from "@school-clerk/ui/spinner";
import { Switch } from "@school-clerk/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@school-clerk/ui/toggle-group";
import { toast } from "@school-clerk/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	AlertTriangle,
	FileSpreadsheet,
	PanelRightOpen,
	Printer,
	RefreshCw,
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
import { _trpc } from "./static-trpc";

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

function StudentGenderBadge({ gender }: { gender?: string | null }) {
	const label = gender === "Male" ? "M" : gender === "Female" ? "F" : null;

	if (!label) return null;

	return (
		<Badge
			variant="outline"
			className="h-5 shrink-0 px-1.5 text-[10px] font-semibold leading-none"
			aria-label={`Gender ${gender}`}
		>
			{label}
		</Badge>
	);
}

const filterKey = (value: string) => value as PageFilterData["value"];

function StudentReportSearchFilter({
	terms,
	classrooms,
	subjects,
}: {
	terms?: Array<{
		id?: string | null;
		label?: string | null;
		title?: string | null;
		sessionTitle?: string | null;
	}>;
	classrooms?: Array<{
		id?: string | null;
		displayName?: string | null;
		departmentName?: string | null;
		classRoom?: { name?: string | null } | null;
	}>;
	subjects: Array<{
		id: string;
		subject: { title?: string | null };
	}>;
}) {
	const filterList = useMemo<PageFilterData[]>(
		() => [
			{
				value: filterKey("termId"),
				icon: "Calendar",
				type: "checkbox",
				label: "Term",
				options: (terms ?? [])
					.map((term) => ({
						value: term.id ?? undefined,
						label:
							term.label ||
							[term.sessionTitle, term.title].filter(Boolean).join(" • ") ||
							term.title ||
							"Term",
					}))
					.filter((option): option is { value: string; label: string } =>
						Boolean(option.value),
					),
			},
			{
				value: filterKey("departmentId"),
				icon: "School",
				type: "checkbox",
				label: "Classroom",
				options: (classrooms ?? [])
					.map((classroom) => ({
						value: classroom.id ?? undefined,
						label:
							classroom.displayName ??
							classroom.departmentName ??
							classroom.classRoom?.name ??
							"Classroom",
					}))
					.filter((option): option is { value: string; label: string } =>
						Boolean(option.value),
					),
			},
			{
				value: filterKey("subjectIds"),
				icon: "BookOpenText",
				type: "checkbox",
				label: "Subjects",
				options: subjects.map((subject) => ({
					value: subject.id,
					label: subject.subject.title ?? "Subject",
				})),
			},
			{
				value: filterKey("search"),
				icon: "Search",
				type: "input",
			},
		],
		[classrooms, subjects, terms],
	);

	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: studentReportSearchFilterParams,
				},
			]}
		>
			<SearchFilter
				defaultSearch={{ search: null }}
				filterList={filterList}
				placeholder="Search students"
			/>
		</SearchFilterProvider>
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
	const { setParams: setClassroomParams } = useClassroomParams();
	const auth = useAuth();
	const role = auth.role;
	const isAdmin = role === "ADMIN" || role === "Admin";
	const { data: terms } = useQuery(_trpc.academics.getReportTerms.queryOptions());
  const [, startSavingLayout] = useTransition();

	const allSubjects = reportData?.subjects ?? [];
	const students = reportData?.studentTermForms ?? [];

	const [sort, setSort] = useState<SortState>(null);
	const [totalsOnly, setTotalsOnly] = useState(false);
	const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
	const deferredNameSearch = useDeferredValue(filters.search ?? "");
  const [classroomLayout, setClassroomLayout] = useState<"ltr" | "rtl">(
    defaultClassroomLayout,
  );
	const isRtl = classroomLayout === "rtl";
	const stickyEdgeClass = isRtl ? "right-0" : "left-0";
	const stickyNameClass = isRtl ? "right-[40px]" : "left-[40px]";
	const dividerClass = isRtl ? "border-r" : "border-l";

	useEffect(() => {
		setClassroomLayout(defaultClassroomLayout);
	}, [defaultClassroomLayout]);

	const previousTermIdRef = useRef(filters.termId);
	useEffect(() => {
		if (previousTermIdRef.current === filters.termId) return;

		const hadPreviousTerm = !!previousTermIdRef.current;
		previousTermIdRef.current = filters.termId;

		if (!hadPreviousTerm) return;

		setFilters({
			activeDepts: [],
			departmentId: null,
			deptId: null,
			printOrder: [],
			subjectIds: [],
		});
	}, [filters.termId, setFilters]);

	const toggleSort = useCallback((column: SortColumn) => {
		setSort((prev) => {
			if (prev?.column !== column) return { column, direction: "asc" };
			if (prev.direction === "asc") return { column, direction: "desc" };
			return null;
		});
	}, []);

	// Keep configured assessment columns visible even when no scores exist yet,
	// so the classroom roster can still be reviewed and filled in from here.
	const visibleSubjects = useMemo(() => {
		return filterResultSubjects({
			subjects: allSubjects,
			selectedSubjectIds: filters.subjectIds ?? [],
		});
	}, [allSubjects, filters.subjectIds]);

	const filteredStudents = useMemo(() => {
		return filterResultStudents({
			students,
			search: deferredNameSearch,
		});
	}, [deferredNameSearch, students]);

	const resultRows = useMemo(() => {
		const rows = buildResultRows({
			subjects: visibleSubjects,
			students: filteredStudents,
		});

		if (!sort) return rows;

		const sorted = [...rows].sort((a, b) => {
			if (sort.column === "student") {
				return a.studentName.toLowerCase().localeCompare(
					b.studentName.toLowerCase(),
				);
			}

			return a.grandTotal - b.grandTotal;
		});

		if (sort.direction === "desc") sorted.reverse();
		return sorted;
	}, [filteredStudents, sort, visibleSubjects]);

  const duplicateNames = useMemo(() => {
		return getDuplicateStudentNameKeys(filteredStudents);
  }, [filteredStudents]);

	const reportRows = useMemo(() => {
		return resultRows.map((row, index) => ({
				studentName: row.studentName,
				index,
				subjectTotals: row.subjectTotals.map((subjectRow) => ({
					subject: subjectRow.subject,
					assessmentScores: subjectRow.cells.map((cell) => cell.score),
					subjectTotal: subjectRow.total,
				})),
				grandTotal: row.grandTotal,
				percentage: row.percentage,
			}));
	}, [resultRows]);

	const totalAssessments = useMemo(
		() =>
			visibleSubjects.reduce(
				(count, subject) => count + subject.assessments.length,
				0,
			),
		[visibleSubjects],
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

	const openClassroomOverview = useCallback(() => {
		if (!filters.departmentId) return;

		setClassroomParams({
			viewClassroomId: filters.departmentId,
			classroomTab: "students",
		});
	}, [filters.departmentId, setClassroomParams]);

	const exportToExcel = useCallback(() => {
		if (!reportRows.length) return;
		const headers = ["S/N", "Student"];
		if (!totalsOnly) {
			for (const subject of visibleSubjects) {
				for (const assessment of subject.assessments) {
					headers.push(
						`${subject.subject.title} - ${getAssessmentDisplayTitle(assessment)}`,
					);
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
							`<th>${subject.subject.title} - ${getAssessmentDisplayTitle(assessment)}</th>`,
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

	const printEmptySpreadsheet = useCallback(() => {
		if (!reportRows.length) return;
		const headers = [
			"<th>S/N</th>",
			"<th>Student</th>",
			...visibleSubjects.flatMap((subject) => {
				if (totalsOnly) return [`<th>${subject.subject.title} Total</th>`];
				return [
					...subject.assessments.map(
						(assessment) =>
							`<th>${subject.subject.title} - ${getAssessmentDisplayTitle(assessment)}</th>`,
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
							...subjectRow.assessmentScores.map(() => `<td>-</td>`),
						);
					}
					cells.push(`<td>-</td>`);
				}
				cells.push(`<td>-</td>`, `<td>-</td>`);
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

		const schoolName = configs.schoolName;
		const schoolAddress = configs.schoolAddress;
		const classroomName = ctx.classroomName ?? "—";
		const sessionName = auth.profile?.sessionTitle ?? "—";
		const termName = auth.profile?.termTitle ?? "—";
		const printDate = new Date().toLocaleDateString("en-GB");
		const printMode = totalsOnly ? "Totals-Only Mode" : "Full Assessment Mode";

		printWindow.document.write(`
      <html>
        <head>
          <title>Blank Spreadsheet - ${classroomName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            .header-container { text-align: center; margin-bottom: 15px; }
            .school-name { font-size: 18px; font-weight: bold; color: #111; margin: 0 0 4px 0; }
            .school-address { font-size: 11px; color: #555; margin: 0; }
            .divider { border-bottom: 3px double #999; margin: 10px 0; }
            .report-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 8px 0; text-align: center; }
            .meta-grid { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
            .meta-item { display: flex; gap: 4px; }
            .meta-label { font-weight: bold; color: #444; }
            .meta-value { border-bottom: 1px dashed #888; padding: 0 4px; min-width: 80px; text-align: center; }
            table { border-collapse: collapse; width: 100%; font-size: 10px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            th, td { border: 1px solid #333; padding: 6px 4px; text-align: center; height: 24px; }
            th { background: #f2f2f2; font-weight: bold; }
            td:nth-child(2), th:nth-child(2) { text-align: ${isRtl ? "right" : "left"}; padding-left: 6px; padding-right: 6px; font-size: 11px; font-weight: 500; }
            @media print {
              body { padding: 0; margin: 0; }
              @page { size: landscape; margin: 8mm; }
            }
          </style>
        </head>
        <body dir="${isRtl ? "rtl" : "ltr"}">
          <div class="header-container">
            <h1 class="school-name">${schoolName}</h1>
            <p class="school-address">${schoolAddress}</p>
            <div class="divider"></div>
            <div class="report-title">Blank Classroom Report Spreadsheet</div>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">Classroom:</span><span class="meta-value">${classroomName}</span></div>
            <div class="meta-item"><span class="meta-label">Session:</span><span class="meta-value">${sessionName}</span></div>
            <div class="meta-item"><span class="meta-label">Term:</span><span class="meta-value">${termName}</span></div>
            <div class="meta-item"><span class="meta-label">Date:</span><span class="meta-value">${printDate}</span></div>
            <div class="meta-item"><span class="meta-label">Mode:</span><span class="meta-value">${printMode}</span></div>
          </div>
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
	}, [ctx.classroomName, isRtl, reportRows, totalsOnly, visibleSubjects, auth.profile?.sessionTitle, auth.profile?.termTitle]);

	const printOrder = filters.printOrder ?? [];
	const activeDepts = filters.activeDepts ?? [];
	const tableStudents = useMemo(
		() => resultRows.map((row) => row.student),
		[resultRows],
	);
	const allSelected =
		tableStudents.length > 0 && tableStudents.every((student) => printOrder.includes(student.id));
	const someSelected =
		!allSelected && tableStudents.some((student) => printOrder.includes(student.id));

	const toggleAll = useCallback(() => {
		if (allSelected) {
			setFilters({
				printOrder: printOrder.filter(
					(termFormId) => !tableStudents.some((student) => student.id === termFormId),
				),
			});
		} else {
			const otherSelections = printOrder.filter(
				(termFormId) => !tableStudents.some((student) => student.id === termFormId),
			);
			setFilters({
				printOrder: [...otherSelections, ...tableStudents.map((student) => student.id)],
				activeDepts:
					filters.departmentId && !activeDepts.includes(filters.departmentId)
						? [...activeDepts, filters.departmentId]
						: activeDepts,
			});
		}
	}, [activeDepts, allSelected, filters.departmentId, printOrder, setFilters, tableStudents]);

	const toggleStudent = useCallback(
		(termFormId: string) => {
			const isSelected = printOrder.includes(termFormId);
			setFilters({
				printOrder: isSelected
					? printOrder.filter((id) => id !== termFormId)
					: [...printOrder, termFormId],
				activeDepts:
					!isSelected && filters.departmentId && !activeDepts.includes(filters.departmentId)
						? [...activeDepts, filters.departmentId]
						: activeDepts,
			});
		},
		[activeDepts, filters.departmentId, printOrder, setFilters],
	);

	if (!filters.departmentId) {
		return (
			<div className="flex items-center justify-center py-12 text-muted-foreground">
				Select a classroom to view students.
			</div>
		);
	}

	if (reportData === undefined) {
		if (ctx.reportError) {
			return (
				<div className="flex min-h-[45vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
					<div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
						<AlertTriangle className="size-7" />
					</div>
					<div className="max-w-md space-y-2">
						<h2 className="text-lg font-semibold tracking-tight">
							Could not load classroom results
						</h2>
						<p className="text-sm leading-6 text-muted-foreground">
							The selected term and classroom could not be loaded. Try again, or
							choose another term/classroom.
						</p>
						<p className="text-xs text-muted-foreground">
							{ctx.reportError instanceof Error
								? ctx.reportError.message
								: "Unknown report loading error."}
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-2">
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={ctx.refetchReportData}
						>
							<RefreshCw className="size-4" />
							Try again
						</Button>
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={openClassroomOverview}
						>
							<PanelRightOpen className="size-4" />
							Open classroom overview
						</Button>
					</div>
				</div>
			);
		}

		if (!ctx.isReportLoading) {
			return (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					Select a term and classroom to view results.
				</div>
			);
		}

		return (
			<div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
				<Spinner size={16} />
				Loading classroom results...
			</div>
		);
	}

	if (!students.length) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
				<p>No students found for this classroom in the selected term.</p>
				<Button
					type="button"
					variant="outline"
					className="gap-2"
					onClick={openClassroomOverview}
				>
					<PanelRightOpen className="size-4" />
					Open classroom overview
				</Button>
			</div>
		);
	}

	return (
		<>
		<div className="flex flex-col gap-3">
			<Card className="overflow-hidden border-border/70 shadow-sm">
				<Card.Header className="border-b bg-background p-3">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="min-w-0">
							<Card.Title className="mb-0 truncate text-sm font-medium">
								{ctx.classroomName ?? "Classroom results"}
							</Card.Title>
							<Card.Description className="text-xs">
								{filteredStudents.length === students.length
									? students.length
									: `${filteredStudents.length}/${students.length}`}{" "}
								students · {visibleSubjects.length} subjects ·{" "}
								{totalsOnly
									? visibleSubjects.length
									: totalAssessments + visibleSubjects.length}{" "}
								columns
							</Card.Description>
						</div>
						<div className="flex flex-wrap items-center gap-2">
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
							>
								<ToggleGroupItem value="ltr">LTR</ToggleGroupItem>
								<ToggleGroupItem value="rtl">RTL</ToggleGroupItem>
							</ToggleGroup>
							<label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
								<span>Totals</span>
								<Switch checked={totalsOnly} onCheckedChange={setTotalsOnly} />
							</label>
							<Button
								variant="outline"
								size="sm"
								className="gap-2"
								onClick={openClassroomOverview}
							>
								<PanelRightOpen className="size-4" />
								Classroom
							</Button>
							{isAdmin && (
								<Button
									variant="outline"
									size="sm"
									className="gap-2"
									onClick={printEmptySpreadsheet}
								>
									<Printer className="size-4" />
									Empty
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								className="gap-2"
								onClick={printSpreadsheet}
							>
								<Printer className="size-4" />
								Print
							</Button>
							<Button size="sm" className="gap-2" onClick={exportToExcel}>
								<FileSpreadsheet className="size-4" />
								Export
							</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content className="p-0">
					<div className="border-b bg-background p-3">
						<StudentReportSearchFilter
							classrooms={ctx.classRooms}
							subjects={allSubjects}
							terms={terms}
						/>
					</div>
					<div className="overflow-auto max-h-[calc(100vh-250px)]">
						<Table dir={isRtl ? "rtl" : "ltr"}>
							<TableHeader className="sticky top-0 z-20">
								<TableRow>
									<TableHead
										rowSpan={2}
										className={cn(
											"sticky z-30 min-w-[40px] bg-background text-center",
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
											"sticky z-30 w-[220px] min-w-[220px] cursor-pointer select-none whitespace-nowrap bg-background",
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
											<button
												type="button"
												onClick={() => setOpenSubjectId(subject.id)}
												className="font-semibold underline-offset-4 hover:underline"
												dir="auto"
											>
												{subject.subject.title}
											</button>
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
														<div>{getAssessmentDisplayTitle(assessment)}</div>
														<div className="text-muted-foreground">
															({assessment.obtainable ?? "-"})
														</div>
													</TableHead>
												))}
											<TableHead
												className={cn(
													"text-center text-xs font-semibold min-w-[60px] bg-background",
													dividerClass,
												)}
											>
												Total
											</TableHead>
										</Fragment>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{resultRows.length ? resultRows.map((row, si) => {
									return (
										<StudentResultRow
											key={row.student.id}
											row={row}
											showAssessments={!totalsOnly}
											index={si}
											isSelected={printOrder.includes(row.student.id)}
											onToggle={toggleStudent}
											isRtl={isRtl}
											dividerClass={dividerClass}
											isDuplicateName={duplicateNames.has(
												getStudentSearchKey(row.student.student),
											)}
										/>
									);
								}) : (
									<TableRow>
										<TableCell
											colSpan={
												2 +
												visibleSubjects.reduce(
													(total, subject) =>
														total +
														(totalsOnly ? 1 : subject.assessments.length + 1),
													0,
												) +
												2
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
				</Card.Content>
			</Card>
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
						Add, edit, remove, or reorder the assessment columns shown in this
						table.
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

interface StudentResultRowProps {
	row: ResultRow<any>;
	showAssessments: boolean;
	index: number;
	isSelected: boolean;
	onToggle: (termFormId: string) => void;
	isRtl: boolean;
	dividerClass: string;
	isDuplicateName: boolean;
}

function StudentResultRow({
	row,
	showAssessments,
	index,
	isSelected,
	onToggle,
	isRtl,
	dividerClass,
	isDuplicateName,
}: StudentResultRowProps) {
	const student = row.student;

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
					onCheckedChange={() => onToggle(student.id)}
					aria-label="Select student"
				/>
			</TableCell>
			<TableCell
				className={cn(
					"sticky z-10 w-[220px] min-w-[220px] bg-background whitespace-nowrap",
					isRtl ? "right-[40px] border-l text-right" : "left-[40px] border-r text-left",
				)}
				dir={isRtl ? "rtl" : "ltr"}
			>
				<div className="flex min-w-0 items-center gap-2">
					<span className="shrink-0 text-xs text-muted-foreground">
						{index + 1}.
					</span>
					<span className="truncate" dir="auto">
						{getStudentDisplayName(student.student)}
					</span>
					<StudentGenderBadge gender={student.student?.gender} />
					{isDuplicateName ? (
						<Badge variant="warning" className="text-[10px] uppercase">
							duplicate
						</Badge>
					) : null}
				</div>
			</TableCell>
			{row.subjectTotals.map((subjectTotal) => {
				const subject = subjectTotal.subject;
				return (
					<Fragment key={subject.id}>
						{showAssessments &&
							subjectTotal.cells.map((cell) => {
								return (
									<AssessmentResultsScoreCell
										key={`${student.id}-${cell.assessment.id}`}
										assessmentId={cell.assessment.id}
										obtainable={cell.assessment.obtainable}
										studentTermFormId={student.id}
										studentId={student.student?.id}
										departmentSubjectId={subject.id}
										result={cell.result}
										dividerClass={dividerClass}
									/>
								);
							})}
						<TableCell
							className={cn("text-center font-medium text-sm", dividerClass)}
						>
							{subjectTotal.total > 0 ? subjectTotal.total.toFixed(1) : "-"}
						</TableCell>
					</Fragment>
				);
			})}
			<TableCell className={cn("text-center font-semibold", dividerClass)}>
				{row.grandTotal > 0 ? row.grandTotal.toFixed(1) : "-"}
			</TableCell>
			<TableCell className={cn("text-center font-semibold", dividerClass)}>
				{row.percentage > 0 ? `${row.percentage}%` : "-"}
			</TableCell>
		</TableRow>
	);
}
