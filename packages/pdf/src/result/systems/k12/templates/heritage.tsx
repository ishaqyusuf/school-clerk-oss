import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ensureResultFontsRegistered } from "../../../shared";
import type { ResultTemplatePayload } from "../../../types";

ensureResultFontsRegistered();

const styles = StyleSheet.create({
  page: {
    padding: 26,
    backgroundColor: "#FFFDF8",
    color: "#1F2937",
    fontFamily: "Amiri",
    fontSize: 10,
  },
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#9A3412",
    padding: 14,
  },
  crestBar: {
    height: 10,
    backgroundColor: "#9A3412",
    marginBottom: 8,
  },
  schoolName: {
    textAlign: "center",
    fontSize: 20,
    color: "#7C2D12",
    fontWeight: 700,
  },
  schoolAddress: {
    textAlign: "center",
    marginTop: 4,
    color: "#78716C",
    fontSize: 10,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    color: "#9A3412",
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 11,
  },
  profileBox: {
    borderWidth: 1,
    borderColor: "#D6D3D1",
    padding: 10,
    marginBottom: 10,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  profileText: {
    textAlign: "right",
    color: "#292524",
  },
  table: {
    borderWidth: 1,
    borderColor: "#D6D3D1",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#D6D3D1",
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F4",
  },
  subjectCell: {
    flex: 2,
    textAlign: "right",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: "#E7E5E4",
  },
  scoreCell: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: "#E7E5E4",
  },
  comments: {
    marginTop: 8,
    gap: 8,
  },
  commentBox: {
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 8,
    minHeight: 38,
  },
  arabicComment: {
    textAlign: "right",
  },
  englishComment: {
    fontFamily: "Helvetica",
  },
  spacer: {
    flexGrow: 1,
  },
  signatures: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  signature: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#9A3412",
    paddingTop: 6,
  },
  signatureText: {
    textAlign: "center",
    color: "#7C2D12",
  },
});

const meta = (label: string, value?: string | number | null) =>
  `${label}: ${value ?? "—"}`;

export function K12HeritageTemplate({
  schoolName,
  schoolAddress,
  termLabel,
  returnDate,
  reports,
  commentLabelArabic = "الملاحظة",
  teacherSignatureLabel = "توقيع المدرس",
  directorSignatureLabel = "توقيع المدير",
}: ResultTemplatePayload) {
  return (
    <Document title={`${schoolName} Student Reports`}>
      {reports.map((report, index) => (
        <Page key={`${report.studentName}-${index}`} size="A4" style={styles.page}>
          <View style={styles.frame}>
            <View style={styles.crestBar} />
            <Text style={styles.schoolName}>{schoolName}</Text>
            {schoolAddress ? <Text style={styles.schoolAddress}>{schoolAddress}</Text> : null}

            <Text style={styles.sectionTitle}>K-12 Heritage Result Sheet</Text>

            <View style={styles.profileBox}>
              <View style={styles.profileRow}>
                <Text style={styles.profileText}>{meta("اسم التلميذ/التلميذة", report.studentName)}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileText}>{meta("الفصل", report.classroomName)}</Text>
                <Text style={styles.profileText}>{meta("الفترة", termLabel)}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileText}>{meta("النسبة المئوية", `${report.percentage}%`)}</Text>
                <Text style={styles.profileText}>
                  {meta("الدرجة", `${report.position} من ${report.totalStudents}`)}
                </Text>
                <Text style={styles.profileText}>{meta("تاريخ العودة", returnDate)}</Text>
              </View>
            </View>

            {report.tables.map((table, tableIndex) => (
              <View key={`table-${tableIndex}`} style={styles.table}>
                <View style={styles.tableHeader}>
                  {table.columns.map((column, columnIndex) => (
                    <Text
                      key={`head-${columnIndex}`}
                      style={columnIndex === 0 ? styles.subjectCell : styles.scoreCell}
                    >
                      {column.label}
                      {column.subLabel ? `\n${column.subLabel}` : ""}
                    </Text>
                  ))}
                </View>
                {table.rows.map((row, rowIndex) => (
                  <View key={`row-${rowIndex}`} style={styles.tableRow}>
                    {row.columns.map((column, columnIndex) => (
                      <Text
                        key={`cell-${rowIndex}-${columnIndex}`}
                        style={columnIndex === 0 ? styles.subjectCell : styles.scoreCell}
                      >
                        {column.value ?? "-"}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.comments}>
              <View style={styles.commentBox}>
                <Text style={styles.arabicComment}>
                  {commentLabelArabic}: {report.commentArabic ?? "—"}
                </Text>
              </View>
              <View style={styles.commentBox}>
                <Text style={styles.englishComment}>
                  Comment: {report.commentEnglish ?? "—"}
                </Text>
              </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.signatures}>
              <View style={styles.signature}>
                <Text style={styles.signatureText}>{directorSignatureLabel}</Text>
              </View>
              <View style={styles.signature}>
                <Text style={styles.signatureText}>{teacherSignatureLabel}</Text>
              </View>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
