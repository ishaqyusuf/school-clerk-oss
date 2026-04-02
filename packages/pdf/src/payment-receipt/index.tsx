import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type PaymentReceiptLine = {
	title: string;
	amount: number;
	description?: string | null;
};

type PaymentReceiptTemplateProps = {
	schoolName: string;
	studentName: string;
	classroom?: string | null;
	term?: string | null;
	paymentDate: string;
	reference?: string | null;
	paymentMethod?: string | null;
	totalAmount: number;
	lines: PaymentReceiptLine[];
};

const styles = StyleSheet.create({
	page: {
		padding: 32,
		fontSize: 11,
		color: "#111827",
		fontFamily: "Helvetica",
	},
	header: {
		marginBottom: 18,
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
	},
	title: {
		fontSize: 20,
		fontWeight: 700,
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 11,
		color: "#4B5563",
	},
	metaGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		columnGap: 24,
		rowGap: 10,
		marginBottom: 18,
	},
	metaItem: {
		width: "47%",
	},
	metaLabel: {
		fontSize: 9,
		textTransform: "uppercase",
		color: "#6B7280",
		marginBottom: 3,
	},
	metaValue: {
		fontSize: 11,
	},
	table: {
		borderWidth: 1,
		borderColor: "#E5E7EB",
		borderRadius: 6,
		overflow: "hidden",
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#F9FAFB",
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
		fontWeight: 700,
	},
	tableRow: {
		flexDirection: "row",
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#F3F4F6",
	},
	tableRowLast: {
		borderBottomWidth: 0,
	},
	colMain: {
		flex: 1,
		paddingRight: 12,
	},
	colAmount: {
		width: 120,
		textAlign: "right",
	},
	description: {
		fontSize: 10,
		color: "#6B7280",
		marginTop: 2,
	},
	totalWrap: {
		marginTop: 18,
		alignSelf: "flex-end",
		width: 220,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		borderRadius: 6,
		padding: 12,
	},
	totalLabel: {
		fontSize: 10,
		color: "#6B7280",
		marginBottom: 4,
	},
	totalValue: {
		fontSize: 18,
		fontWeight: 700,
	},
	footer: {
		marginTop: 20,
		fontSize: 10,
		color: "#6B7280",
	},
});

export function PaymentReceiptTemplate({
	schoolName,
	studentName,
	classroom,
	term,
	paymentDate,
	reference,
	paymentMethod,
	totalAmount,
	lines,
}: PaymentReceiptTemplateProps) {
	return (
		<Document title={`Payment Receipt - ${studentName}`}>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{schoolName}</Text>
					<Text style={styles.subtitle}>Student Payment Receipt</Text>
				</View>

				<View style={styles.metaGrid}>
					<View style={styles.metaItem}>
						<Text style={styles.metaLabel}>Student</Text>
						<Text style={styles.metaValue}>{studentName}</Text>
					</View>
					<View style={styles.metaItem}>
						<Text style={styles.metaLabel}>Payment Date</Text>
						<Text style={styles.metaValue}>{paymentDate}</Text>
					</View>
					<View style={styles.metaItem}>
						<Text style={styles.metaLabel}>Classroom</Text>
						<Text style={styles.metaValue}>{classroom || "—"}</Text>
					</View>
					<View style={styles.metaItem}>
						<Text style={styles.metaLabel}>Term</Text>
						<Text style={styles.metaValue}>{term || "—"}</Text>
					</View>
					<View style={styles.metaItem}>
						<Text style={styles.metaLabel}>Reference</Text>
						<Text style={styles.metaValue}>{reference || "—"}</Text>
					</View>
					<View style={styles.metaItem}>
						<Text style={styles.metaLabel}>Payment Method</Text>
						<Text style={styles.metaValue}>{paymentMethod || "—"}</Text>
					</View>
				</View>

				<View style={styles.table}>
					<View style={styles.tableHeader}>
						<Text style={styles.colMain}>Fee Breakdown</Text>
						<Text style={styles.colAmount}>Amount</Text>
					</View>
					{lines.map((line, index) => (
						<View
							key={`${line.title}-${index}`}
							style={[
								styles.tableRow,
								index === lines.length - 1 ? styles.tableRowLast : null,
							]}
						>
							<View style={styles.colMain}>
								<Text>{line.title}</Text>
								{line.description ? (
									<Text style={styles.description}>{line.description}</Text>
								) : null}
							</View>
							<Text style={styles.colAmount}>
								NGN {line.amount.toLocaleString()}
							</Text>
						</View>
					))}
				</View>

				<View style={styles.totalWrap}>
					<Text style={styles.totalLabel}>Total Amount Paid</Text>
					<Text style={styles.totalValue}>
						NGN {totalAmount.toLocaleString()}
					</Text>
				</View>

				<Text style={styles.footer}>
					This receipt was generated from SchoolClerk.
				</Text>
			</Page>
		</Document>
	);
}
