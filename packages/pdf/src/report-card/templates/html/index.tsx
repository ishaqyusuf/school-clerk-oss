"use client";

import { cn } from "@school-clerk/ui/cn";
import {
	type ReportCardConfig,
	formatReportNumerals,
} from "@school-clerk/utils/report-card";
import { type CSSProperties, useMemo, useRef } from "react";
import {
	REPORT_BASE_GAP,
	REPORT_CARD_BASE_FONT_PX,
	type ReportCardSizes,
	type ReportCardText,
	buildReportCardText,
	reportCardColumnLabel,
	reportCardCommentLines,
	reportCardInfoFields,
	reportCardLineCount,
	reportCardRowCount,
	reportCardScoreText,
	reportCardSections,
	reportCardSizes,
	splitSubjectCell,
} from "../../content";
import type { ReportCardRenderProps, ReportCardTable } from "../../types";
import { useReportCardFit } from "./use-report-card-fit";

export type HtmlReportCardFonts = {
	/** Class that applies the Arabic body font (Amiri). */
	body?: string;
	/** Class that applies the handwritten address font. */
	script?: string;
};

type HtmlReportCardProps = ReportCardRenderProps & {
	className?: string;
	fonts?: HtmlReportCardFonts;
};

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
	sizes: ReportCardSizes;
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
			{tables.map((table, tableIndex) => (
				<table
					// biome-ignore lint/suspicious/noArrayIndexKey: tables have no id and never reorder.
					key={tableIndex}
					dir={config.layout.direction}
					className={cn(
						"w-full border-collapse",
						variant === "ledger" && tableIndex > 0 && "mt-2",
					)}
				>
					<thead>
						<tr className={cn(variant === "ledger" && "bg-black/[0.06]")}>
							{table.columns.map((column, columnIndex) => (
								<th
									// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional.
									key={columnIndex}
									className={cn(
										"border-x border-b border-black/45 px-2 py-2 align-middle font-bold leading-tight text-black",
										(tableIndex === 0 || variant === "ledger") && "border-t",
										columnIndex === 0 ? "text-start" : "w-[17%] text-center",
									)}
								>
									<div className="flex flex-col">
										<span>
											{reportCardColumnLabel(config, table, columnIndex)}
										</span>
										{column.subLabel ? (
											<span className="text-[0.85em] font-semibold">
												{formatReportNumerals(column.subLabel, numerals)}
											</span>
										) : null}
									</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{table.rows.map((row, rowIndex) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional.
							<tr key={rowIndex}>
								{row.columns.map((cell, cellIndex) => {
									if (cellIndex === 0) {
										const subject = splitSubjectCell(cell.value);
										return (
											<td
												// biome-ignore lint/suspicious/noArrayIndexKey: cells are positional.
												key={cellIndex}
												style={cellStyle}
												className="border-x border-b border-black/45 px-2 text-start font-bold leading-tight"
											>
												{subject.number && config.table.numberSubjects ? (
													<span>
														{formatReportNumerals(subject.number, numerals)}.{" "}
													</span>
												) : null}
												{/* Isolate the title so an Arabic subject in an LTR table keeps its number at the start. */}
												<bdi>{subject.title}</bdi>
											</td>
										);
									}
									return (
										<td
											// biome-ignore lint/suspicious/noArrayIndexKey: cells are positional.
											key={cellIndex}
											style={cellStyle}
											className="border-x border-b border-black/45 px-2 text-center leading-tight"
										>
											{reportCardScoreText(config, cell.value)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			))}
		</div>
	);
}

function CommentBlock({
	config,
	text,
}: { config: ReportCardConfig; text: ReportCardText }) {
	const lines = reportCardCommentLines(config, text);
	const { comments } = config;
	return (
		<div className="flex flex-col gap-7">
			{lines.map((line) =>
				comments.mode === "blank" ? (
					<div key={line.key} dir={line.dir} className="flex flex-col gap-7">
						{Array.from({ length: comments.blankLines }).map((_, index) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: blank lines are positional.
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

function SignatureSlot({
	label,
	imageUrl,
}: { label: string; imageUrl?: string | null }) {
	return (
		<div className="flex flex-col items-center">
			<div className="flex h-[64px] items-end justify-center">
				{imageUrl ? (
					<img
						alt=""
						src={imageUrl}
						className="max-h-[64px] max-w-[160px] object-contain"
					/>
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
	return (
		// Class teacher sits on the reading-start side, the head on the end side.
		<div dir={layout.direction} className="flex items-end justify-between">
			{signatures.showTeacher ? (
				<SignatureSlot
					label={labels.teacherSignature}
					imageUrl={
						signatures.useClassTeacherSignature ? teacherSignatureUrl : null
					}
				/>
			) : (
				<span />
			)}
			{signatures.showHead ? (
				<SignatureSlot
					label={labels.headSignature}
					imageUrl={signatures.headImageUrl}
				/>
			) : null}
		</div>
	);
}

function SchoolHeading({
	config,
	sizes,
	fonts,
}: {
	config: ReportCardConfig;
	sizes: ReportCardSizes;
	fonts?: HtmlReportCardFonts;
}) {
	const script = config.school.addressStyle === "script";
	return (
		<div className="flex flex-col items-center gap-1 text-center">
			<p
				className="font-bold leading-tight text-black/75"
				style={{ fontSize: `${sizes.school}em` }}
			>
				{config.school.name || "School name"}
			</p>
			{config.school.address ? (
				<p
					dir="ltr"
					className={cn(
						"leading-snug text-black",
						script ? fonts?.script : "font-semibold",
					)}
					style={{ fontSize: `${sizes.address * (script ? 1 : 0.7)}em` }}
				>
					{config.school.address}
				</p>
			) : null}
		</div>
	);
}

function ClassicHeader({
	props,
	text,
	sizes,
	fonts,
}: {
	props: ReportCardRenderProps;
	text: ReportCardText;
	sizes: ReportCardSizes;
	fonts?: HtmlReportCardFonts;
}) {
	const { config, report } = props;
	const fields = reportCardInfoFields(config, text, report.classroomName);
	return (
		<div className="flex flex-col gap-4">
			<SchoolHeading config={config} sizes={sizes} fonts={fonts} />
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
						<span className="whitespace-nowrap text-black/70">
							{config.labels.studentName}
						</span>
						<span>:</span>
						<span className="inline-flex min-w-0 flex-1 flex-wrap border-b-2 border-dashed border-black/40 px-3">
							{text.name.map((part, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: name parts are positional.
								<span key={index} className="px-1.5">
									{part}
								</span>
							))}
						</span>
					</div>
					{config.header.showAcademicYear && text.academicYear ? (
						<div className="flex items-end whitespace-nowrap">
							<span className="text-black/70">
								{config.labels.academicYear}
							</span>
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
								{field.value || " "}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function LedgerHeader({
	props,
	text,
	sizes,
	fonts,
}: {
	props: ReportCardRenderProps;
	text: ReportCardText;
	sizes: ReportCardSizes;
	fonts?: HtmlReportCardFonts;
}) {
	const { config, report } = props;
	const cells = [
		{
			key: "name",
			label: config.labels.studentName,
			value: text.name.join(" "),
		},
		...(config.header.showAcademicYear && text.academicYear
			? [
					{
						key: "year",
						label: config.labels.academicYear,
						value: text.academicYear,
					},
				]
			: []),
		...reportCardInfoFields(config, text, report.classroomName),
	];
	return (
		<div className="flex flex-col gap-4">
			<div className="border-b-2 border-black/60 pb-3">
				<SchoolHeading config={config} sizes={sizes} fonts={fonts} />
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
						<span className="font-bold">{cell.value || " "}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * One A4 report card as HTML, for on-screen previews. The PDF template in
 * `../pdf` draws the same content from the same helpers.
 */
export function HtmlReportCard(props: HtmlReportCardProps) {
	const { config, report, templateId, term, fonts } = props;
	const text = useMemo(
		() => buildReportCardText({ config, report, term, templateId }),
		[config, report, term, templateId],
	);
	const sizes = reportCardSizes(report.tables);
	const lineCount = reportCardLineCount(report.tables);
	const rows = reportCardRowCount(report.tables);
	const { hasComments, hasSignatures, gaps } = reportCardSections(config);

	const areaRef = useRef<HTMLDivElement>(null);
	const headerRef = useRef<HTMLDivElement>(null);
	const tablesRef = useRef<HTMLDivElement>(null);
	const commentsRef = useRef<HTMLDivElement>(null);
	const signaturesRef = useRef<HTMLDivElement>(null);
	const refs = useMemo(
		() => ({
			area: areaRef,
			sections: [headerRef, tablesRef, commentsRef, signaturesRef],
		}),
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
				fonts?.body,
				props.className,
			)}
			style={{
				width: "210mm",
				height: "297mm",
				padding: `${config.layout.pageMarginMm}mm`,
				fontSize: `${REPORT_CARD_BASE_FONT_PX * config.layout.fontScale}px`,
			}}
		>
			<div
				ref={areaRef}
				className={cn(
					"relative h-full w-full",
					ledger && "border-[3px] border-double border-black/70 p-[5mm]",
				)}
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
							<LedgerHeader
								props={props}
								text={text}
								sizes={sizes}
								fonts={fonts}
							/>
						) : (
							<ClassicHeader
								props={props}
								text={text}
								sizes={sizes}
								fonts={fonts}
							/>
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
							<Signatures
								config={config}
								teacherSignatureUrl={props.teacherSignatureUrl}
							/>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
