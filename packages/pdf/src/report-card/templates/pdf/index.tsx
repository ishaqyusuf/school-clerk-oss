import {
	Document,
	Image,
	Page,
	Text,
	View,
	renderToBuffer,
} from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import {
	type ReportCardConfig,
	formatReportNumerals,
} from "@school-clerk/utils/report-card";
import type { ReactElement } from "react";
import { toPdfParagraph } from "../../arabic-shaping";
import {
	REPORT_BASE_GAP,
	REPORT_BASE_ROW_PAD,
	REPORT_CARD_BASE_FONT_PX,
	type ReportCardSizes,
	type ReportCardText,
	buildReportCardText,
	reportCardColumnLabel,
	reportCardCommentLines,
	reportCardInfoFields,
	reportCardPageLayout,
	reportCardScoreText,
	reportCardSections,
	reportCardSizes,
	splitSubjectCell,
} from "../../content";
import type { ReportCardRenderProps, ReportCardTable } from "../../types";
import {
	REPORT_CARD_PDF_FONT,
	REPORT_CARD_PDF_SCRIPT_FONT,
	registerReportCardFonts,
} from "./fonts";

/** CSS px → PDF pt (the HTML page is 210mm wide at 96dpi, the PDF at 72dpi). */
const pt = (px: number) => px * 0.75;
const mm = (value: number) => (value * 72) / 25.4;

const A4 = { width: mm(210), height: mm(297) };
const LINE_HEIGHT = 1.35;
/** Generous average glyph width in em; only used to cap how far a row may grow. */
const CHAR_WIDTH_EM = 0.5;
const SCORE_COLUMN_SHARE = 0.17;

const COLORS = {
	ink: "#000000",
	label: "#4D4D4D",
	heading: "#404040",
	muted: "#666666",
	rule: "#8C8C8C",
	dashed: "#999999",
	ledgerHead: "#F0F0F0",
	frame: "#4D4D4D",
};

type Direction = "rtl" | "ltr";

const rowDirection = (dir: Direction) =>
	dir === "rtl" ? ("row-reverse" as const) : ("row" as const);
const startAlign = (dir: Direction) =>
	dir === "rtl" ? ("right" as const) : ("left" as const);
/** Separator between two cells in a row, on the side touching the previous cell. */
const separator = (dir: Direction, width: number): Style =>
	dir === "rtl" ? { borderRightWidth: width } : { borderLeftWidth: width };

function linesFor(text: string, fontSize: number, width: number) {
	if (!text || width <= 0) return 1;
	return Math.max(
		1,
		Math.ceil((Array.from(text).length * CHAR_WIDTH_EM * fontSize) / width),
	);
}

function P({
	children,
	dir,
	style,
}: {
	children: string | number | null | undefined;
	dir: Direction;
	style?: Style | Style[];
}) {
	return (
		<Text style={[{ lineHeight: LINE_HEIGHT }, ...[style ?? []].flat()]}>
			{toPdfParagraph(children, dir)}
		</Text>
	);
}

type Metrics = {
	base: number;
	sizes: ReportCardSizes;
	contentWidth: number;
	/** Starting vertical padding of a subject cell. */
	rowPad: number;
	/** Largest padding a row may grow to when the page is fitted. */
	rowMaxPad: number;
	grow: boolean;
	ledger: boolean;
	dir: Direction;
};

function scoreColumnWidth(table: ReportCardTable) {
	const scoreColumns = Math.max(1, table.columns.length - 1);
	return Math.min(SCORE_COLUMN_SHARE, 0.6 / scoreColumns);
}

function SchoolHeading({
	config,
	m,
}: { config: ReportCardConfig; m: Metrics }) {
	const script = config.school.addressStyle === "script";
	return (
		<View style={{ alignItems: "center", gap: pt(4) }}>
			<P
				dir={config.layout.direction}
				style={{
					fontSize: m.base * m.sizes.school,
					fontWeight: 700,
					color: COLORS.heading,
					textAlign: "center",
					lineHeight: 1.25,
				}}
			>
				{config.school.name || "School name"}
			</P>
			{config.school.address ? (
				<P
					dir="ltr"
					style={{
						fontSize: m.base * m.sizes.address * (script ? 1 : 0.7),
						fontFamily: script
							? REPORT_CARD_PDF_SCRIPT_FONT
							: REPORT_CARD_PDF_FONT,
						fontWeight: script ? 400 : 700,
						textAlign: "center",
					}}
				>
					{config.school.address}
				</P>
			) : null}
		</View>
	);
}

function ClassicHeader({
	props,
	text,
	m,
}: { props: ReportCardRenderProps; text: ReportCardText; m: Metrics }) {
	const { config, report } = props;
	const dir = config.layout.direction;
	const fontSize = m.base * m.sizes.info;
	const fields = reportCardInfoFields(config, text, report.classroomName);
	return (
		<View style={{ gap: pt(16) }}>
			<SchoolHeading config={config} m={m} />
			<View style={{ gap: pt(4) }}>
				<View style={{ borderBottomWidth: pt(4), borderColor: COLORS.rule }} />
				<View style={{ borderBottomWidth: pt(1), borderColor: COLORS.rule }} />
			</View>
			<View style={{ gap: pt(12), fontSize, fontWeight: 700 }}>
				<View
					style={{
						flexDirection: rowDirection(dir),
						alignItems: "flex-end",
						gap: pt(16),
					}}
				>
					<View
						style={{
							flexDirection: rowDirection(dir),
							alignItems: "flex-end",
							flexGrow: 1,
							flexShrink: 1,
						}}
					>
						<P dir={dir} style={{ color: COLORS.label }}>
							{`${config.labels.studentName}:`}
						</P>
						<View
							style={{
								flexGrow: 1,
								flexShrink: 1,
								borderBottomWidth: pt(2),
								borderStyle: "dashed",
								borderColor: COLORS.dashed,
								paddingHorizontal: pt(12),
							}}
						>
							<P dir={dir} style={{ textAlign: startAlign(dir) }}>
								{text.name.join("   ")}
							</P>
						</View>
					</View>
					{config.header.showAcademicYear && text.academicYear ? (
						<View style={{ flexDirection: rowDirection(dir), gap: pt(4) }}>
							<P dir={dir} style={{ color: COLORS.label }}>
								{`${config.labels.academicYear}:`}
							</P>
							<P dir={dir}>{text.academicYear}</P>
						</View>
					) : null}
				</View>
				<View
					style={{
						flexDirection: rowDirection(dir),
						flexWrap: "wrap",
						alignItems: "flex-end",
						columnGap: pt(12),
						rowGap: pt(8),
					}}
				>
					{fields.map((field) => (
						<View
							key={field.key}
							style={{
								flexDirection: rowDirection(dir),
								alignItems: "flex-end",
							}}
						>
							<P dir={dir} style={{ color: COLORS.label }}>
								{`${field.label}:`}
							</P>
							<View
								style={{
									minWidth: fontSize * 2.5,
									marginHorizontal: pt(4),
									borderBottomWidth: pt(1),
									borderColor: COLORS.rule,
								}}
							>
								<P dir={dir} style={{ textAlign: "center" }}>
									{field.value || " "}
								</P>
							</View>
						</View>
					))}
				</View>
			</View>
		</View>
	);
}

function LedgerHeader({
	props,
	text,
	m,
}: { props: ReportCardRenderProps; text: ReportCardText; m: Metrics }) {
	const { config, report } = props;
	const dir = config.layout.direction;
	const cells = [
		{
			key: "name",
			label: config.labels.studentName,
			value: text.name.join("  "),
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
	const fontSize = m.base * m.sizes.info * 0.92;
	const line = pt(1);
	return (
		<View style={{ gap: pt(16) }}>
			<View
				style={{
					paddingBottom: pt(12),
					borderBottomWidth: pt(2),
					borderColor: "#666666",
				}}
			>
				<SchoolHeading config={config} m={m} />
			</View>
			<View
				style={{
					flexDirection: rowDirection(dir),
					flexWrap: "wrap",
					borderTopWidth: line,
					...(dir === "rtl"
						? { borderRightWidth: line }
						: { borderLeftWidth: line }),
					borderColor: COLORS.rule,
					fontSize,
				}}
			>
				{cells.map((cell, index) => (
					<View
						key={cell.key}
						style={{
							width: index === 0 ? "100%" : "50%",
							flexDirection: rowDirection(dir),
							alignItems: "flex-end",
							gap: pt(8),
							paddingHorizontal: pt(12),
							paddingVertical: pt(6),
							borderBottomWidth: line,
							...(dir === "rtl"
								? { borderLeftWidth: line }
								: { borderRightWidth: line }),
							borderColor: COLORS.rule,
						}}
					>
						<P
							dir={dir}
							style={{
								fontSize: fontSize * 0.85,
								fontWeight: 700,
								color: COLORS.muted,
							}}
						>
							{cell.label}
						</P>
						<P dir={dir} style={{ fontWeight: 700, flexShrink: 1 }}>
							{cell.value || " "}
						</P>
					</View>
				))}
			</View>
		</View>
	);
}

function ResultTables({
	config,
	tables,
	m,
}: { config: ReportCardConfig; tables: ReportCardTable[]; m: Metrics }) {
	const dir = config.layout.direction;
	const numerals = config.layout.numerals;
	const line = pt(1);
	const cellFont = m.base * m.sizes.cell;
	return (
		<View style={m.grow ? { flexGrow: 2, flexShrink: 0 } : undefined}>
			{tables.map((table, tableIndex) => {
				const scoreWidth = `${scoreColumnWidth(table) * 100}%`;
				const subjectWidth =
					m.contentWidth *
						(1 - scoreColumnWidth(table) * (table.columns.length - 1)) -
					pt(16);
				const cellBox = (columnIndex: number): Style => ({
					...(columnIndex === 0
						? { flexGrow: 1, flexShrink: 1, flexBasis: 0 }
						: { width: scoreWidth }),
					...(columnIndex > 0 ? separator(dir, line) : {}),
					borderColor: COLORS.rule,
					paddingHorizontal: pt(8),
					justifyContent: "center",
				});
				return (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: tables have no id and never reorder.
						key={tableIndex}
						style={{
							marginTop: m.ledger && tableIndex > 0 ? pt(8) : 0,
							...(m.grow ? { flexGrow: table.rows.length, flexShrink: 0 } : {}),
						}}
					>
						<View
							style={{
								flexDirection: rowDirection(dir),
								borderLeftWidth: line,
								borderRightWidth: line,
								borderBottomWidth: line,
								borderTopWidth: tableIndex === 0 || m.ledger ? line : 0,
								borderColor: COLORS.rule,
								backgroundColor: m.ledger ? COLORS.ledgerHead : undefined,
							}}
						>
							{table.columns.map((column, columnIndex) => (
								<View
									// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional.
									key={columnIndex}
									style={[cellBox(columnIndex), { paddingVertical: pt(8) }]}
								>
									<P
										dir={dir}
										style={{
											fontSize: m.base,
											fontWeight: 700,
											lineHeight: 1.15,
											textAlign: columnIndex === 0 ? startAlign(dir) : "center",
										}}
									>
										{reportCardColumnLabel(config, table, columnIndex)}
									</P>
									{column.subLabel ? (
										<P
											dir={dir}
											style={{
												fontSize: m.base * 0.85,
												fontWeight: 700,
												lineHeight: 1.15,
												textAlign:
													columnIndex === 0 ? startAlign(dir) : "center",
											}}
										>
											{formatReportNumerals(column.subLabel, numerals)}
										</P>
									) : null}
								</View>
							))}
						</View>
						{table.rows.map((row, rowIndex) => {
							const subject = splitSubjectCell(row.columns[0]?.value);
							// A generous line estimate only loosens the cap, never clips text.
							const lines = linesFor(
								`${subject.number ?? ""}. ${subject.title}`,
								cellFont,
								subjectWidth,
							);
							return (
								<View
									// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional.
									key={rowIndex}
									style={{
										flexDirection: rowDirection(dir),
										borderLeftWidth: line,
										borderRightWidth: line,
										borderBottomWidth: line,
										borderColor: COLORS.rule,
										...(m.grow
											? {
													flexGrow: 1,
													flexShrink: 0,
													maxHeight:
														cellFont * LINE_HEIGHT * lines +
														2 * m.rowMaxPad +
														line,
												}
											: {}),
									}}
								>
									{row.columns.map((cell, cellIndex) => {
										const box = [
											cellBox(cellIndex),
											{ paddingVertical: m.rowPad },
										];
										if (cellIndex === 0) {
											return (
												<View
													// biome-ignore lint/suspicious/noArrayIndexKey: cells are positional.
													key={cellIndex}
													style={[
														...box,
														{
															flexDirection: rowDirection(dir),
															alignItems: "center",
															justifyContent: "flex-start",
														},
													]}
												>
													{subject.number && config.table.numberSubjects ? (
														<P
															dir={dir}
															style={{
																fontSize: cellFont,
																fontWeight: 700,
																...(dir === "rtl"
																	? { marginLeft: pt(6) }
																	: { marginRight: pt(6) }),
															}}
														>
															{`${formatReportNumerals(subject.number, numerals)}.`}
														</P>
													) : null}
													<P
														dir={dir}
														style={{
															fontSize: cellFont,
															fontWeight: 700,
															flexShrink: 1,
															textAlign: startAlign(dir),
														}}
													>
														{subject.title}
													</P>
												</View>
											);
										}
										return (
											<View
												// biome-ignore lint/suspicious/noArrayIndexKey: cells are positional.
												key={cellIndex}
												style={box}
											>
												<P
													dir={dir}
													style={{ fontSize: cellFont, textAlign: "center" }}
												>
													{reportCardScoreText(config, cell.value)}
												</P>
											</View>
										);
									})}
								</View>
							);
						})}
					</View>
				);
			})}
		</View>
	);
}

function CommentBlock({
	config,
	text,
	m,
}: { config: ReportCardConfig; text: ReportCardText; m: Metrics }) {
	const { comments } = config;
	const dashed: Style = {
		borderBottomWidth: pt(2),
		borderStyle: "dashed",
		borderColor: COLORS.dashed,
	};
	return (
		<View style={{ gap: pt(28) }}>
			{reportCardCommentLines(config, text).map((line) =>
				comments.mode === "blank" ? (
					<View key={line.key} style={{ gap: pt(28) }}>
						{Array.from({ length: comments.blankLines }).map((_, index) => (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: blank lines are positional.
								key={index}
								style={[
									dashed,
									{
										minHeight: m.base * 1.6,
										flexDirection: rowDirection(line.dir),
										alignItems: "flex-end",
									},
								]}
							>
								{index === 0 ? (
									<P
										dir={line.dir}
										style={{ fontSize: m.base * 1.2, fontWeight: 700 }}
									>
										{`${line.label}:`}
									</P>
								) : null}
							</View>
						))}
					</View>
				) : (
					<View
						key={line.key}
						style={[
							dashed,
							{ flexDirection: rowDirection(line.dir), alignItems: "flex-end" },
						]}
					>
						<P
							dir={line.dir}
							style={{ fontSize: m.base * 1.2, fontWeight: 700 }}
						>
							{`${line.label}:`}
						</P>
						<P
							dir={line.dir}
							style={{
								fontSize: m.base * 1.4,
								paddingHorizontal: pt(16),
								flexShrink: 1,
								textAlign: startAlign(line.dir),
							}}
						>
							{line.value ?? ""}
						</P>
					</View>
				),
			)}
		</View>
	);
}

function SignatureSlot({
	label,
	imageUrl,
	m,
	dir,
}: { label: string; imageUrl?: string | null; m: Metrics; dir: Direction }) {
	return (
		<View style={{ alignItems: "center" }}>
			<View
				style={{
					height: pt(64),
					justifyContent: "flex-end",
					alignItems: "center",
				}}
			>
				{imageUrl ? (
					<Image
						src={imageUrl}
						style={{
							maxHeight: pt(64),
							maxWidth: pt(160),
							objectFit: "contain",
						}}
					/>
				) : null}
			</View>
			<View
				style={{
					width: pt(150),
					borderTopWidth: pt(1),
					borderStyle: "dashed",
					borderColor: "#808080",
					paddingTop: pt(4),
				}}
			>
				<P dir={dir} style={{ fontSize: m.base, textAlign: "center" }}>
					{label}
				</P>
			</View>
		</View>
	);
}

function Signatures({
	config,
	teacherSignatureUrl,
	m,
}: {
	config: ReportCardConfig;
	teacherSignatureUrl?: string | null;
	m: Metrics;
}) {
	const { signatures, labels } = config;
	const dir = config.layout.direction;
	return (
		// Class teacher sits on the reading-start side, the head on the end side.
		<View
			style={{
				flexDirection: rowDirection(dir),
				justifyContent: "space-between",
				alignItems: "flex-end",
			}}
		>
			{signatures.showTeacher ? (
				<SignatureSlot
					label={labels.teacherSignature}
					imageUrl={
						signatures.useClassTeacherSignature ? teacherSignatureUrl : null
					}
					m={m}
					dir={dir}
				/>
			) : (
				<View />
			)}
			{signatures.showHead ? (
				<SignatureSlot
					label={labels.headSignature}
					imageUrl={signatures.headImageUrl}
					m={m}
					dir={dir}
				/>
			) : null}
		</View>
	);
}

export type PdfReportCardPageProps = ReportCardRenderProps & {
	/** Multiplies the template's type size; set by the fit pass for overflowing reports. */
	fitScale?: number;
	/**
	 * Lays the page out at its natural height (rows at their tightest, no
	 * growth) so the fit pass can read how tall the report really is.
	 */
	measure?: boolean;
};

const PAGE_SAFETY = pt(4);

function pageInsets(props: ReportCardRenderProps) {
	const margin = mm(reportCardPageLayout(props).pageMarginMm);
	const frame = props.templateId === "framed-ledger" ? pt(3) + mm(5) : 0;
	return { margin, frame, vertical: 2 * margin + 2 * frame };
}

/** One A4 report card page, drawn with react-pdf. */
export function PdfReportCardPage({
	fitScale = 1,
	measure = false,
	...props
}: PdfReportCardPageProps) {
	const { config, report, templateId } = props;
	const dir = config.layout.direction;
	const ledger = templateId === "framed-ledger";
	const text = buildReportCardText(props);
	const sizes = reportCardSizes(report.tables);
	const { hasComments, hasSignatures, gaps } = reportCardSections(config);

	const { margin, frame } = pageInsets(props);
	const contentWidth = A4.width - 2 * margin - 2 * frame;
	const baseGap = pt(REPORT_BASE_GAP);
	const fitToPage = config.layout.fitToPage;
	const grow = fitToPage && !measure;
	const base =
		pt(REPORT_CARD_BASE_FONT_PX) *
		reportCardPageLayout(props).fontScale *
		fitScale;

	const m: Metrics = {
		base,
		sizes,
		contentWidth,
		rowPad: fitToPage ? pt(2) : pt(REPORT_BASE_ROW_PAD),
		rowMaxPad: fitToPage ? pt(30) : pt(REPORT_BASE_ROW_PAD),
		grow,
		ledger,
		dir,
	};
	// Section gaps take a third of the free space (two thirds go to the rows),
	// up to 40px each.
	const gap: Style = grow
		? {
				flexBasis: baseGap,
				flexGrow: 1 / gaps,
				flexShrink: 1,
				minHeight: 0,
				maxHeight: baseGap + pt(40),
			}
		: { height: baseGap };
	const content = (
		<View style={{ flexGrow: 1, flexDirection: "column" }}>
			{ledger ? (
				<LedgerHeader props={props} text={text} m={m} />
			) : (
				<ClassicHeader props={props} text={text} m={m} />
			)}
			<View style={gap} />
			<ResultTables config={config} tables={report.tables} m={m} />
			<View
				style={{
					flexGrow: grow ? 0.01 : measure ? 0 : 1,
					flexShrink: 1,
					minHeight: 0,
				}}
			/>
			{hasComments ? (
				<>
					<View style={gap} />
					<CommentBlock config={config} text={text} m={m} />
				</>
			) : null}
			{hasSignatures ? (
				<>
					<View style={gap} />
					<Signatures
						config={config}
						teacherSignatureUrl={props.teacherSignatureUrl}
						m={m}
					/>
				</>
			) : null}
		</View>
	);

	return (
		<Page
			size="A4"
			// A page that does not wrap takes its content's height, which is what the fit pass reads.
			wrap={measure ? false : undefined}
			style={{
				padding: margin,
				fontFamily: REPORT_CARD_PDF_FONT,
				fontSize: base,
				color: COLORS.ink,
				backgroundColor: "#FFFFFF",
			}}
		>
			{ledger ? (
				<View
					style={{
						flexGrow: 1,
						borderWidth: pt(1),
						borderColor: COLORS.frame,
						padding: pt(1),
					}}
				>
					<View
						style={{
							flexGrow: 1,
							borderWidth: pt(1),
							borderColor: COLORS.frame,
							padding: mm(5),
						}}
					>
						{content}
					</View>
				</View>
			) : (
				content
			)}
		</Page>
	);
}

export type PdfReportCardDocumentProps = {
	reports: ReportCardRenderProps[];
	title?: string;
	/** Public URL of the dashboard's `/fonts/` folder, used when the fonts are not on disk. */
	fontBaseUrl?: string | URL;
	/** Per-report type scale from `fitReportCards`; 1 when omitted. */
	fitScales?: number[];
	measure?: boolean;
};

/** A printable document with one page per student. */
export function PdfReportCardDocument({
	reports,
	title = "Report cards",
	fontBaseUrl,
	fitScales,
	measure,
}: PdfReportCardDocumentProps) {
	registerReportCardFonts(fontBaseUrl);
	return (
		<Document title={title}>
			{reports.map((report, index) => (
				<PdfReportCardPage
					key={`${report.report.id}-${index}`}
					{...report}
					fitScale={fitScales?.[index] ?? 1}
					measure={measure}
				/>
			))}
		</Document>
	);
}

/**
 * Renders a document to a buffer. Under Bun, react-pdf occasionally misses
 * the end of its output stream and never settles (Node is unaffected), so a
 * render that produces nothing in time is tried once more.
 */
async function renderPdf(element: ReactElement<DocumentProps>, pages: number) {
	const limit = 10_000 + pages * 1_000;
	for (let attempt = 0; ; attempt++) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const timeout = new Promise<null>((resolve) => {
			timer = setTimeout(() => resolve(null), limit);
		});
		const buffer = await Promise.race([renderToBuffer(element), timeout]);
		clearTimeout(timer);
		if (buffer) return buffer;
		if (attempt >= 1) throw new Error("Rendering the report cards timed out.");
	}
}

function pageHeights(pdf: Buffer) {
	return Array.from(
		pdf
			.toString("latin1")
			.matchAll(/\/MediaBox \[\s*[\d.]+\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s*\]/g),
		(match) => Number(match[1]),
	);
}

/**
 * Works out a type scale per report so each one fits a single A4 page.
 * react-pdf cannot measure ahead of rendering, so overflowing reports are
 * rendered at their natural height, scaled down and checked again.
 */
export async function fitReportCards(
	reports: ReportCardRenderProps[],
	options: { fontBaseUrl?: string | URL; maxPasses?: number } = {},
) {
	const scales = reports.map(() => 1);
	let pending = reports
		.map((report, index) => (report.config.layout.fitToPage ? index : -1))
		.filter((index) => index >= 0);
	for (
		let pass = 0;
		pending.length && pass < (options.maxPasses ?? 5);
		pass++
	) {
		const pdf = await renderPdf(
			<PdfReportCardDocument
				reports={pending.map(
					(index) => reports[index] as ReportCardRenderProps,
				)}
				fitScales={pending.map((index) => scales[index] ?? 1)}
				fontBaseUrl={options.fontBaseUrl}
				measure
			/>,
			pending.length,
		);
		const heights = pageHeights(pdf);
		pending = pending.filter((index, position) => {
			const report = reports[index] as ReportCardRenderProps;
			const height = heights[position] ?? 0;
			const { vertical } = pageInsets(report);
			const available = A4.height - vertical - PAGE_SAFETY;
			const content = height - vertical;
			if (content <= available) return false;
			const current = scales[index] ?? 1;
			// Fixed parts (signature space, borders, gaps) do not shrink with the
			// type, so step a little further than the ratio and check again.
			scales[index] = Math.max(0.5, current * (available / content) * 0.97);
			return scales[index] > 0.5;
		});
	}
	return scales;
}

/** Renders report cards to a PDF buffer, one fitted A4 page per student. */
export async function renderReportCardsToBuffer(
	reports: ReportCardRenderProps[],
	options: { title?: string; fontBaseUrl?: string | URL } = {},
) {
	registerReportCardFonts(options.fontBaseUrl);
	const fitScales = await fitReportCards(reports, options);
	return renderPdf(
		<PdfReportCardDocument
			reports={reports}
			title={options.title}
			fontBaseUrl={options.fontBaseUrl}
			fitScales={fitScales}
		/>,
		reports.length,
	);
}
