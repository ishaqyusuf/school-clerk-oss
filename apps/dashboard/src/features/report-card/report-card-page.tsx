"use client";

import { arabic, moonDance } from "@/fonts";
import { cn } from "@school-clerk/ui/cn";
import {
	type ReportCardConfig,
	applyNameCalligraphy,
	formatReportAcademicYear,
	formatReportDate,
	formatReportNumerals,
	formatReportPosition,
	formatReportTermLabel,
	reportDensity,
	resolveReportComment,
} from "@school-clerk/utils/report-card";
import { type CSSProperties, type ReactNode, useMemo, useRef } from "react";
import type { ReportCardRenderProps, ReportCardTable } from "./types";
import { REPORT_BASE_GAP, useReportCardFit } from "./use-report-card-fit";

const DENSITY_SIZES = {
	spacious: { cell: 1.5, school: 1.9, address: 1.45, info: 1.25 },
	relaxed: { cell: 1.45, school: 1.85, address: 1.3, info: 1.25 },
	regular: { cell: 1.25, school: 1.55, address: 1.2, info: 1.2 },
	dense: { cell: 1.1, school: 1.45, address: 1.05, info: 1.1 },
} as const;

type Sizes = (typeof DENSITY_SIZES)[keyof typeof DENSITY_SIZES];

function lineCountOf(tables: ReportCardTable[]) {
	return tables.reduce((total, table) => total + 1 + table.rows.length, 0);
}

function useReportText(props: ReportCardRenderProps) {
	const { config, report, term } = props;
	const numerals = config.layout.numerals;
	return useMemo(() => {
		const name = report.nameParts
			.filter(Boolean)
			.map((part) => applyNameCalligraphy(part, config.calligraphy));
		const comment =
			config.comments.mode === "auto"
				? resolveReportComment(report.grade.percentage, config.comments.bands)
				: null;
		return {
			name,
			academicYear: formatReportAcademicYear(term.sessionTitle, config),
			term: formatReportTermLabel(term.title, config.header),
			percentage: `${formatReportNumerals(report.grade.percentage, numerals)}%`,
			totalScore: `${formatReportNumerals(report.grade.obtained, numerals)}/${formatReportNumerals(report.grade.obtainable, numerals)}`,
			position: formatReportPosition(
				report.grade.position,
				report.grade.totalStudents,
				config,
			),
			resumption: formatReportDate(term.resumptionDate, config),
			comment,
		};
	}, [config, numerals, report, term]);
}

type ReportText = ReturnType<typeof useReportText>;

function infoFields(config: ReportCardConfig, text: ReportText, classroomName: string) {
	const { header, labels } = config;
	return [
		{ key: "classroom", label: labels.classroom, value: classroomName, show: true },
		{ key: "term", label: labels.term, value: text.term, show: header.showTerm },
		{
			key: "percentage",
			label: labels.percentage,
			value: text.percentage,
			show: header.showPercentage,
		},
		{
			key: "total",
			label: labels.totalScore,
			value: text.totalScore,
			show: header.showTotalScore,
		},
		{
			key: "position",
			label: labels.position,
			value: text.position,
			show: header.showPosition && !!text.position,
		},
		{
			key: "resumption",
			label: labels.resumptionDate,
			value: text.resumption,
			show: header.showResumptionDate,
		},
	].filter((field) => field.show);
}

function ResultTables({
	config,
	tables,
	rowPad,
	sizes,
	variant,
}: {
	config: ReportCardConfig;
	tables: ReportCardTable[];
	rowPad: number;
	sizes: Sizes;
	variant: "classic" | "ledger";
}) {
	const numerals = config.layout.numerals;
	const cellStyle: CSSProperties = {
		paddingTop: rowPad,
		paddingBottom: rowPad,
		fontSize: `${sizes.cell}em`,
	};
	return (
		<div className="flex flex-col">
			{tables.map((table, tableIndex) => {
				const lastColumn = table.columns.length - 1;
				return (
					<table
						key={tableIndex}
						dir={config.layout.direction}
						className={cn(
							"w-full border-collapse",
							variant === "ledger" && tableIndex > 0 && "mt-2",
						)}
					>
						<thead>
							<tr className={cn(variant === "ledger" && "bg-black/[0.06]")}>
								{table.columns.map((column, columnIndex) => {
									const label =
										columnIndex === 0
											? config.labels.subjects || column.label
											: columnIndex === lastColumn && lastColumn > 1
												? config.labels.total || column.label
												: column.label;
									return (
										<th
											key={columnIndex}
											className={cn(
												"border-x border-b border-black/45 px-2 py-2 align-middle font-bold leading-tight text-black",
												(tableIndex === 0 || variant === "ledger") && "border-t",
												columnIndex === 0 ? "text-start" : "w-[17%] text-center",
											)}
										>
											<div className="flex flex-col">
												<span>{label}</span>
												{column.subLabel ? (
													<span className="text-[0.85em] font-semibold">
														{formatReportNumerals(column.subLabel, numerals)}
													</span>
												) : null}
											</div>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{table.rows.map((row, rowIndex) => (
								<tr key={rowIndex}>
									{row.columns.map((cell, cellIndex) => {
										const value = cell.value;
										if (cellIndex === 0) {
											// Subject cells arrive as "3. Title"; isolate the title so an
											// Arabic subject in an LTR table keeps its number at the start.
											const match = typeof value === "string" ? value.match(/^\s*(\d+)\.\s*(.*)$/) : null;
											return (
												<td
													key={cellIndex}
													style={cellStyle}
													className="border-x border-b border-black/45 px-2 text-start font-bold leading-tight"
												>
													{match && config.table.numberSubjects ? (
														<span>{formatReportNumerals(match[1], numerals)}. </span>
													) : null}
													<bdi>{match ? match[2] : (value ?? "")}</bdi>
												</td>
											);
										}
										const empty = value === null || value === undefined || value === "" || value === 0;
										return (
											<td
												key={cellIndex}
												style={cellStyle}
												className={cn(
													"border-x border-b border-black/45 px-2 leading-tight",
													cellIndex === 0 ? "text-start font-bold" : "text-center",
												)}
											>
												{empty && cellIndex > 0
													? config.table.emptyCell
													: formatReportNumerals(value ?? "", numerals)}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				);
			})}
		</div>
	);
}

function CommentBlock({ config, text }: { config: ReportCardConfig; text: ReportText }) {
	const { comments, labels, layout } = config;
	if (!comments.enabled) return null;
	const lines = [
		comments.showPrimary
			? {
					key: "primary",
					label: labels.commentPrimary,
					value: text.comment?.primary,
					dir: layout.direction,
				}
			: null,
		comments.showSecondary
			? {
					key: "secondary",
					label: labels.commentSecondary,
					value: text.comment?.secondary,
					dir: comments.secondaryDirection,
				}
			: null,
	].filter(Boolean) as { key: string; label: string; value?: string; dir: "rtl" | "ltr" }[];

	return (
		<div className="flex flex-col gap-7">
			{lines.map((line) =>
				comments.mode === "blank" ? (
					<div key={line.key} dir={line.dir} className="flex flex-col gap-7">
						{Array.from({ length: comments.blankLines }).map((_, index) => (
							<div
								key={index}
								className="flex min-h-[1.6em] items-end gap-2 border-b-2 border-dashed border-black/40"
							>
								{index === 0 ? (
									<span className="text-[1.2em] font-bold">{line.label}:</span>
								) : null}
							</div>
						))}
					</div>
				) : (
					<div
						key={line.key}
						dir={line.dir}
						className="border-b-2 border-dashed border-black/40"
					>
						<span className="text-[1.2em] font-bold">{line.label}:</span>
						<span className="px-4 text-[1.4em]">{line.value ?? ""}</span>
					</div>
				),
			)}
		</div>
	);
}

function SignatureSlot({ label, imageUrl }: { label: string; imageUrl?: string | null }) {
	return (
		<div className="flex flex-col items-center">
			<div className="flex h-[64px] items-end justify-center">
				{imageUrl ? (
					// biome-ignore lint/performance/noImgElement: data URLs and print need a plain image
					<img alt="" src={imageUrl} className="max-h-[64px] max-w-[160px] object-contain" />
				) : null}
			</div>
			<div className="flex w-[150px] justify-center border-t border-dashed border-black/50 pt-1 text-[1em]">
				{label}
			</div>
		</div>
	);
}

function Signatures({
	config,
	teacherSignatureUrl,
}: {
	config: ReportCardConfig;
	teacherSignatureUrl?: string | null;
}) {
	const { signatures, labels, layout } = config;
	if (!signatures.showHead && !signatures.showTeacher) return null;
	return (
		// Class teacher sits on the reading-start side, the head on the end side.
		<div dir={layout.direction} className="flex items-end justify-between">
			{signatures.showTeacher ? (
				<SignatureSlot
					label={labels.teacherSignature}
					imageUrl={signatures.useClassTeacherSignature ? teacherSignatureUrl : null}
				/>
			) : (
				<span />
			)}
			{signatures.showHead ? (
				<SignatureSlot label={labels.headSignature} imageUrl={signatures.headImageUrl} />
			) : null}
		</div>
	);
}

function SchoolHeading({ config, sizes, centered = true }: { config: ReportCardConfig; sizes: Sizes; centered?: boolean }) {
	return (
		<div className={cn("flex flex-col gap-1", centered && "items-center text-center")}>
			<p className="font-bold leading-tight text-black/75" style={{ fontSize: `${sizes.school}em` }}>
				{config.school.name || "School name"}
			</p>
			{config.school.address ? (
				<p
					dir="ltr"
					className={cn(
						"leading-snug text-black",
						config.school.addressStyle === "script" ? moonDance.className : "font-semibold",
					)}
					style={{ fontSize: `${sizes.address * (config.school.addressStyle === "script" ? 1 : 0.7)}em` }}
				>
					{config.school.address}
				</p>
			) : null}
		</div>
	);
}

function ClassicHeader({ props, text, sizes }: { props: ReportCardRenderProps; text: ReportText; sizes: Sizes }) {
	const { config, report } = props;
	const fields = infoFields(config, text, report.classroomName);
	return (
		<div className="flex flex-col gap-4">
			<SchoolHeading config={config} sizes={sizes} />
			<div className="flex flex-col gap-1">
				<div className="w-full border-b-4 border-black/45" />
				<div className="w-full border-b border-black/45" />
			</div>
			<div
				dir={config.layout.direction}
				className="flex flex-col gap-3 font-semibold"
				style={{ fontSize: `${sizes.info}em` }}
			>
				<div className="flex items-end gap-4">
					<div className="flex min-w-0 flex-1 items-end">
						<span className="whitespace-nowrap text-black/70">{config.labels.studentName}</span>
						<span>:</span>
						<span className="inline-flex min-w-0 flex-1 flex-wrap border-b-2 border-dashed border-black/40 px-3">
							{text.name.map((part, index) => (
								<span key={index} className="px-1.5">
									{part}
								</span>
							))}
						</span>
					</div>
					{config.header.showAcademicYear && text.academicYear ? (
						<div className="flex items-end whitespace-nowrap">
							<span className="text-black/70">{config.labels.academicYear}</span>
							<span>:</span>
							<span className="mx-1">{text.academicYear}</span>
						</div>
					) : null}
				</div>
				<div className="flex flex-wrap items-end gap-x-3 gap-y-2">
					{fields.map((field) => (
						<div key={field.key} className="flex items-end whitespace-nowrap">
							<span className="text-black/70">{field.label}</span>
							<span>:</span>
							<span className="mx-1 min-w-[2.5em] border-b border-black/45 text-center">
								{field.value || " "}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function LedgerHeader({ props, text, sizes }: { props: ReportCardRenderProps; text: ReportText; sizes: Sizes }) {
	const { config, report } = props;
	const fields = infoFields(config, text, report.classroomName);
	const cells: { key: string; label: string; value: ReactNode }[] = [
		{
			key: "name",
			label: config.labels.studentName,
			value: text.name.join(" "),
		},
		...(config.header.showAcademicYear && text.academicYear
			? [{ key: "year", label: config.labels.academicYear, value: text.academicYear }]
			: []),
		...fields,
	];
	return (
		<div className="flex flex-col gap-4">
			<div className="border-b-2 border-black/60 pb-3">
				<SchoolHeading config={config} sizes={sizes} />
			</div>
			<div
				dir={config.layout.direction}
				className="grid grid-cols-2 border-t border-s border-black/45"
				style={{ fontSize: `${sizes.info * 0.92}em` }}
			>
				{cells.map((cell, index) => (
					<div
						key={cell.key}
						className={cn(
							"flex items-baseline gap-2 border-e border-b border-black/45 px-3 py-1.5",
							index === 0 && "col-span-2",
						)}
					>
						<span className="whitespace-nowrap text-[0.85em] font-semibold text-black/60">
							{cell.label}
						</span>
						<span className="font-bold">{cell.value || " "}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * One A4 report card. Every template shares the same page box, fit logic and
 * data; they differ only in how the header and frame are drawn.
 */
export function ReportCardPage(props: ReportCardRenderProps & { className?: string }) {
	const { config, report, templateId } = props;
	const text = useReportText(props);
	const lineCount = lineCountOf(report.tables);
	const sizes = DENSITY_SIZES[reportDensity(lineCount)];
	const rows = report.tables.reduce((total, table) => total + table.rows.length, 0);
	const hasComments = config.comments.enabled && (config.comments.showPrimary || config.comments.showSecondary);
	const hasSignatures = config.signatures.showHead || config.signatures.showTeacher;
	const gaps = 1 + (hasComments ? 1 : 0) + (hasSignatures ? 1 : 0);

	const areaRef = useRef<HTMLDivElement>(null);
	const headerRef = useRef<HTMLDivElement>(null);
	const tablesRef = useRef<HTMLDivElement>(null);
	const commentsRef = useRef<HTMLDivElement>(null);
	const signaturesRef = useRef<HTMLDivElement>(null);
	const refs = useMemo(
		() => ({ area: areaRef, sections: [headerRef, tablesRef, commentsRef, signaturesRef] }),
		[],
	);
	const fit = useReportCardFit({
		enabled: config.layout.fitToPage,
		rows,
		gaps,
		refs,
		dependencyKey: `${templateId}:${JSON.stringify(config)}:${report.id}:${lineCount}`,
	});

	const gapStyle: CSSProperties = { marginTop: REPORT_BASE_GAP + fit.gap };
	const ledger = templateId === "framed-ledger";

	return (
		<div
			className={cn(
				"report-card-page relative mx-auto box-border overflow-hidden bg-white text-black",
				arabic.className,
				props.className,
			)}
			style={{
				width: "210mm",
				height: "297mm",
				padding: `${config.layout.pageMarginMm}mm`,
				fontSize: `${16 * config.layout.fontScale}px`,
			}}
		>
			<div
				ref={areaRef}
				className={cn("relative h-full w-full", ledger && "border-[3px] border-double border-black/70 p-[5mm]")}
			>
				<div
					className="flex flex-col"
					style={{
						width: `${100 / fit.scale}%`,
						height: `${100 / fit.scale}%`,
						transform: fit.scale === 1 ? undefined : `scale(${fit.scale})`,
						transformOrigin: "top left",
					}}
				>
					<div ref={headerRef}>
						{ledger ? (
							<LedgerHeader props={props} text={text} sizes={sizes} />
						) : (
							<ClassicHeader props={props} text={text} sizes={sizes} />
						)}
					</div>
					<div ref={tablesRef} style={gapStyle}>
						<ResultTables
							config={config}
							tables={report.tables}
							rowPad={fit.rowPad}
							sizes={sizes}
							variant={ledger ? "ledger" : "classic"}
						/>
					</div>
					<div className="min-h-0 flex-1" />
					{hasComments ? (
						<div ref={commentsRef} style={gapStyle}>
							<CommentBlock config={config} text={text} />
						</div>
					) : null}
					{hasSignatures ? (
						<div ref={signaturesRef} style={gapStyle}>
							<Signatures config={config} teacherSignatureUrl={props.teacherSignatureUrl} />
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
