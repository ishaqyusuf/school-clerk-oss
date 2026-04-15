import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ensureResultFontsRegistered } from "../../../shared";
import type { ResultTemplatePayload } from "../../../types";

ensureResultFontsRegistered();

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: "#FCFBF7",
    color: "#1F2937",
    fontFamily: "Amiri",
    fontSize: 10,
  },
  chromeTop: {
    height: 14,
    backgroundColor: "#7C3AED",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    marginBottom: 8,
  },
  headerWrap: {
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    color: "#4C1D95",
    fontWeight: 700,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 4,
    color: "#6B7280",
  },
  ribbon: {
    marginTop: 10,
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F5F3FF",
    color: "#5B21B6",
    fontSize: 10,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 12,
    padding: 10,
  },
  statLabel: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 12,
    color: "#111827",
    textAlign: "center",
  },
  studentPanel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  studentName: {
    textAlign: "right",
    fontSize: 17,
    color: "#111827",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 10,
    color: "#374151",
    textAlign: "right",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#F5F3FF",
    borderBottomWidth: 1,
    borderBottomColor: "#DDD6FE",
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  subjectCell: {
    flex: 1.9,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    textAlign: "right",
  },
  scoreCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    textAlign: "center",
  },
  commentsWrap: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  commentCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 12,
    padding: 10,
    minHeight: 70,
  },
  commentTitle: {
    fontSize: 10,
    color: "#6D28D9",
    marginBottom: 6,
  },
  commentBodyArabic: {
    fontSize: 11,
    textAlign: "right",
  },
  commentBodyEnglish: {
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  spacer: {
    flexGrow: 1,
  },
  footer: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  signatureCard: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#7C3AED",
    paddingTop: 8,
  },
  signatureText: {
    textAlign: "center",
    fontSize: 10,
    color: "#4C1D95",
  },
});

const text = (label: string, value?: string | number | null) =>
  `${label}: ${value ?? "—"}`;

export function K12ScholarTemplate({
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
          <View style={styles.chromeTop} />

          <View style={styles.headerWrap}>
            <Text style={styles.title}>{schoolName}</Text>
            {schoolAddress ? <Text style={styles.subtitle}>{schoolAddress}</Text> : null}
            <Text style={styles.ribbon}>K-12 Scholar Report Sheet</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>النسبة المئوية</Text>
              <Text style={styles.statValue}>{report.percentage}%</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>الدرجة</Text>
              <Text style={styles.statValue}>
                {report.position} / {report.totalStudents}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>الفترة</Text>
              <Text style={styles.statValue}>{termLabel ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.studentPanel}>
            <Text style={styles.studentName}>{report.studentName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{text("الفصل", report.classroomName)}</Text>
              <Text style={styles.metaText}>{text("تاريخ العودة", returnDate)}</Text>
            </View>
          </View>

          {report.tables.map((table, tableIndex) => (
            <View key={`table-${tableIndex}`} style={styles.tableCard}>
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

          <View style={styles.commentsWrap}>
            <View style={styles.commentCard}>
              <Text style={styles.commentTitle}>{commentLabelArabic}</Text>
              <Text style={styles.commentBodyArabic}>{report.commentArabic ?? "—"}</Text>
            </View>
            <View style={styles.commentCard}>
              <Text style={styles.commentTitle}>Comment</Text>
              <Text style={styles.commentBodyEnglish}>{report.commentEnglish ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.footer}>
            <View style={styles.signatureCard}>
              <Text style={styles.signatureText}>{directorSignatureLabel}</Text>
            </View>
            <View style={styles.signatureCard}>
              <Text style={styles.signatureText}>{teacherSignatureLabel}</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
