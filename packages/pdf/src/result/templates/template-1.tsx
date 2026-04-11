import { Document, Image, Page, StyleSheet } from "@react-pdf/renderer";
import { Text, View } from "@school-clerk/react-pdf";
import "../../fonts";
import {
	formatResultValue,
	formatStudentName,
	getDensity,
	getGradePositionText,
	getLineCount,
} from "../helpers";
import type { ResultTemplateProps, ResultTemplateReport } from "../types";

const styles = StyleSheet.create({
	page: {
		paddingTop: 28,
		paddingRight: 24,
		paddingBottom: 28,
		paddingLeft: 24,
		fontFamily: "Amiri",
		color: "#111827",
		fontSize: 11,
	},
	pageInner: {
		flexDirection: "column",
		height: "100%",
	},
	headerWrap: {
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
	},
	schoolName: {
		fontSize: 20,
		fontFamily: "Amiri",
		marginBottom: 4,
	},
	schoolAddress: {
		fontSize: 11,
		fontFamily: "MoonDance",
	},
	dividerPrimary: {
		height: 4,
		backgroundColor: "#6B7280",
		marginBottom: 4,
	},
	dividerSecondary: {
		height: 1,
		backgroundColor: "#111827",
		marginBottom: 12,
	},
	metadataBlock: {
		flexDirection: "column",
	},
	metadataRow: {
		flexDirection: "row",
		justifyContent: "flex-start",
		marginBottom: 8,
	},
	metadataCellWide: {
		flexDirection: "row",
		alignItems: "flex-end",
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: 0,
		marginRight: 8,
	},
	metadataCell: {
		flexDirection: "row",
		alignItems: "flex-end",
		marginRight: 8,
	},
	metadataLabel: {
		color: "#374151",
	},
	dashedValue: {
		borderBottomWidth: 1,
		borderBottomColor: "#9CA3AF",
		borderBottomStyle: "dashed",
		paddingHorizontal: 4,
		minHeight: 18,
	},
	dashedValueWide: {
		flexGrow: 1,
		flexShrink: 1,
	},
	tableSection: {
		flexDirection: "column",
	},
	table: {
		width: "100%",
		borderTopWidth: 1,
		borderTopColor: "#6B7280",
	},
	tableHead: {
		flexDirection: "row",
		backgroundColor: "#F9FAFB",
		borderBottomWidth: 1,
		borderBottomColor: "#D1D5DB",
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
	},
	firstColumn: {
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: 0,
		textAlign: "right",
		borderLeftWidth: 1,
		borderLeftColor: "#E5E7EB",
		paddingHorizontal: 6,
	},
	numericColumn: {
		width: 58,
		textAlign: "center",
		borderLeftWidth: 1,
		borderLeftColor: "#E5E7EB",
		paddingHorizontal: 4,
	},
	lastColumn: {
		width: 72,
	},
	headerLabel: {
		textAlign: "center",
		fontFamily: "Amiri",
	},
	headerSubLabel: {
		textAlign: "center",
		color: "#4B5563",
	},
	footerWrap: {
		marginTop: "auto",
		paddingTop: 16,
	},
	commentRow: {
		borderBottomWidth: 1.5,
		borderBottomStyle: "dashed",
		borderBottomColor: "#6B7280",
		paddingBottom: 8,
	},
	commentLabel: {
		fontSize: 13,
	},
	commentValue: {
		fontSize: 20,
		paddingHorizontal: 8,
	},
	signatures: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 24,
	},
	signatureColumn: {
		position: "relative",
		width: 120,
		alignItems: "center",
	},
	signatureImageSpacer: {
		height: 24,
		marginBottom: 8,
	},
	signatureImage: {
		width: 80,
		height: 40,
		objectFit: "contain",
	},
	signatureLabel: {
		width: "100%",
		textAlign: "center",
		borderTopWidth: 1,
		borderTopStyle: "dashed",
		borderTopColor: "#111827",
		paddingTop: 4,
	},
});

const labels = {
	studentName: "اسم التلميذ/التلميذة",
	academicYear: "العام الدراسي",
	class: "الفصل",
	term: "الفترة",
	percentage: "النسبة المئوية",
	position: "الدرجة",
	returnDate: "تاريخ العودة",
	englishComment: "Comment",
};

export function ResultTemplate1({
	reports,
	config,
	title = "Student Result",
}: ResultTemplateProps) {
	return (
		<Document title={title}>
			{reports.map((report, index) => (
				<Template1Page
					key={report.id ?? `${report.student.name ?? "student"}-${index}`}
					report={report}
					config={config}
				/>
			))}
		</Document>
	);
}

function Template1Page({
	report,
	config,
}: Pick<ResultTemplateProps, "config"> & { report: ResultTemplateReport }) {
	const lineCount = getLineCount(report);
	const density = getDensity(lineCount);
	const nameParts = formatStudentName(report.student, config.calligraphs);
	const classroom = report.classroom ?? config.classroom ?? "—";
	const term = report.term ?? config.term ?? "—";
	const academicYear = report.academicYear ?? config.academicYear ?? "—";
	const returnDate = report.returnDate ?? config.returnDate ?? "—";
	const commentLabel = config.commentLabel ?? "الملاحظة";

	return (
		<Page size="A4" style={styles.page}>
			<View style={styles.pageInner}>
				<View style={styles.headerWrap}>
					<Text style={styles.schoolName}>{config.schoolName}</Text>
					{config.schoolAddress ? (
						<Text style={styles.schoolAddress}>{config.schoolAddress}</Text>
					) : null}
				</View>

				<View style={styles.dividerPrimary} />
				<View style={styles.dividerSecondary} />

				<View style={styles.metadataBlock}>
					<View
						style={[styles.metadataRow, { fontSize: density.metaFontSize }]}
					>
						<View style={styles.metadataCellWide}>
							<Text style={styles.metadataLabel}>{labels.studentName}</Text>
							<Text>:</Text>
							<View style={[styles.dashedValue, styles.dashedValueWide]}>
								<Text>
									{nameParts.length
										? nameParts.join(" ")
										: formatResultValue("-")}
								</Text>
							</View>
						</View>

						<View style={styles.metadataCell}>
							<Text style={styles.metadataLabel}>{labels.academicYear}</Text>
							<Text>:</Text>
							<Text>{formatResultValue(academicYear)}</Text>
						</View>
					</View>

					<View
						style={[styles.metadataRow, { fontSize: density.metaFontSize }]}
					>
						<MetaPair label={labels.class} value={classroom} />
						<MetaPair label={labels.term} value={term} />
						<MetaPair
							label={labels.percentage}
							value={
								report.grade?.percentage === null ||
								report.grade?.percentage === undefined
									? "-"
									: `${formatResultValue(report.grade.percentage)}%`
							}
						/>
						<MetaPair
							label={labels.position}
							value={getGradePositionText(report)}
						/>
						<MetaPair label={labels.returnDate} value={returnDate} />
					</View>
				</View>

				<View style={styles.tableSection}>
					{report.tables.map((table, tableIndex) => (
						<View
							key={`${tableIndex}-${table.columns.length}`}
							style={[
								styles.table,
								tableIndex > 0 ? { marginTop: density.sectionGap } : null,
							]}
						>
							<View style={styles.tableHead}>
								{table.columns.map((column, columnIndex) => {
									const isFirstColumn = columnIndex === 0;
									const isLastColumn = columnIndex === table.columns.length - 1;

									return (
										<View
											key={`${column.label}-${columnIndex}`}
											style={[
												isFirstColumn
													? styles.firstColumn
													: styles.numericColumn,
												isLastColumn ? styles.lastColumn : null,
												{
													paddingTop: density.rowPaddingY,
													paddingBottom: density.rowPaddingY,
												},
											]}
										>
											<Text
												style={[
													styles.headerLabel,
													{ fontSize: density.tableHeaderFontSize },
												]}
											>
												{column.label}
											</Text>
											{column.subLabel ? (
												<Text
													style={[
														styles.headerSubLabel,
														{ fontSize: density.tableHeaderFontSize - 1 },
													]}
												>
													{column.subLabel}
												</Text>
											) : null}
										</View>
									);
								})}
							</View>

							{table.rows.map((row, rowIndex) => (
								<View
									key={`${tableIndex}-${rowIndex}`}
									style={styles.tableRow}
									wrap={false}
								>
									{row.columns.map((column, columnIndex) => {
										const isFirstColumn = columnIndex === 0;
										const isLastColumn = columnIndex === row.columns.length - 1;

										return (
											<View
												key={`${rowIndex}-${columnIndex}`}
												style={[
													isFirstColumn
														? styles.firstColumn
														: styles.numericColumn,
													isLastColumn ? styles.lastColumn : null,
													{
														paddingTop: density.rowPaddingY,
														paddingBottom: density.rowPaddingY,
													},
												]}
											>
												<Text
													style={{
														textAlign: isFirstColumn ? "right" : "center",
														fontSize: density.tableFontSize,
													}}
												>
													{formatResultValue(column.value)}
												</Text>
											</View>
										);
									})}
								</View>
							))}
						</View>
					))}
				</View>

				<View style={styles.footerWrap}>
					<View>
						<CommentRow
							label={`${commentLabel}:`}
							value={report.comment?.arabic ?? "-"}
						/>
						<CommentRow
							label={`${labels.englishComment}:`}
							value={report.comment?.english ?? "-"}
							dir="ltr"
							style={{ marginTop: density.sectionGap }}
						/>
					</View>

					<View style={styles.signatures}>
						<SignatureLabel
							label={config.directorSignature}
							imageSrc={config.signatureImageSrc}
						/>
						<SignatureLabel label={config.teacherSignature} />
					</View>
				</View>
			</View>
		</Page>
	);
}

function MetaPair({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.metadataCell}>
			<Text style={styles.metadataLabel}>{label}</Text>
			<Text>:</Text>
			<View style={styles.dashedValue}>
				<Text>{formatResultValue(value)}</Text>
			</View>
		</View>
	);
}

function CommentRow({
	label,
	value,
	dir = "rtl",
	style,
}: {
	label: string;
	value: string;
	dir?: "rtl" | "ltr";
	style?: object;
}) {
	return (
		<View style={[styles.commentRow, style]}>
			<Text style={styles.commentLabel}>{label}</Text>
			<Text
				style={[
					styles.commentValue,
					{ textAlign: dir === "ltr" ? "left" : "right" },
				]}
			>
				{value}
			</Text>
		</View>
	);
}

function SignatureLabel({
	label,
	imageSrc,
}: {
	label?: string | null;
	imageSrc?: string | null;
}) {
	return (
		<View style={styles.signatureColumn}>
			<View style={styles.signatureImageSpacer}>
				{imageSrc ? (
					<Image src={imageSrc} style={styles.signatureImage} />
				) : null}
			</View>
			<Text style={styles.signatureLabel}>{label || "—"}</Text>
		</View>
	);
}
