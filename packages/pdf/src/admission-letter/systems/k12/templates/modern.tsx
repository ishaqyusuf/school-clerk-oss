import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { AdmissionLetterTemplatePayload } from "../../../types";

const styles = StyleSheet.create({
  page: {
    padding: 34,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.45,
  },
  shell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 24,
  },
  band: {
    height: 8,
    backgroundColor: "#0F766E",
    borderRadius: 4,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 18,
  },
  schoolBlock: {
    flex: 1,
  },
  schoolName: {
    fontWeight: 700,
    fontSize: 21,
    color: "#0F172A",
  },
  schoolAddress: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 5,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#CCFBF1",
    color: "#115E59",
    fontWeight: 700,
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  title: {
    fontWeight: 700,
    fontSize: 26,
    marginBottom: 12,
    color: "#134E4A",
  },
  intro: {
    fontSize: 12,
    marginBottom: 18,
  },
  profileRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 18,
  },
  details: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 12,
    gap: 6,
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 8,
    textTransform: "uppercase",
  },
  detailValue: {
    fontWeight: 700,
    fontSize: 11,
  },
  passport: {
    width: 104,
    height: 118,
    borderRadius: 6,
    objectFit: "cover",
  },
  passportFallback: {
    width: 104,
    height: 118,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    color: "#94A3B8",
    fontSize: 8,
    textAlign: "center",
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    marginTop: 10,
    gap: 5,
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#0F766E",
    fontSize: 12,
  },
  signatureRow: {
    marginTop: 38,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signature: {
    width: 170,
    borderTopWidth: 1,
    borderTopColor: "#0F172A",
    paddingTop: 6,
    color: "#334155",
    textAlign: "center",
  },
  footer: {
    marginTop: "auto",
    color: "#64748B",
    fontSize: 8,
  },
});

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "Not specified"}</Text>
    </View>
  );
}

export function ModernAdmissionLetterTemplate({
  applicationReference,
  approvedAt,
  classroomName,
  parentName,
  passportPhotoUrl,
  payment,
  schoolAddress,
  schoolName,
  sessionLabel,
  studentName,
}: AdmissionLetterTemplatePayload) {
  return (
    <Document title={`${studentName} Admission Letter`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <View style={styles.band} />
          <View style={styles.headerRow}>
            <View style={styles.schoolBlock}>
              <Text style={styles.schoolName}>{schoolName}</Text>
              {schoolAddress ? <Text style={styles.schoolAddress}>{schoolAddress}</Text> : null}
            </View>
            <Text style={styles.badge}>Approved admission</Text>
          </View>

          <Text style={styles.title}>Admission Letter</Text>
          <Text style={styles.intro}>
            Congratulations. {studentName} has been admitted into {classroomName || "the selected class"}.
          </Text>

          <View style={styles.profileRow}>
            <View style={styles.details}>
              <Detail label="Student" value={studentName} />
              <Detail label="Class" value={classroomName} />
              <Detail label="Session" value={sessionLabel} />
              <Detail label="Parent/guardian" value={parentName} />
              <Detail label="Reference" value={applicationReference} />
              <Detail label="Approved on" value={approvedAt} />
            </View>
            {passportPhotoUrl ? (
              <Image src={passportPhotoUrl} style={styles.passport} />
            ) : (
              <View style={styles.passportFallback}>
                <Text>Student passport</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next steps</Text>
            {payment?.required ? (
              <>
                <Text>{payment.label || "Admission payment"}: {payment.amount || "Not specified"}</Text>
                {payment.dueAt ? <Text>Due date: {payment.dueAt}</Text> : null}
                {payment.instructions ? <Text>{payment.instructions}</Text> : null}
              </>
            ) : (
              <Text>No admission payment is required before the next step.</Text>
            )}
            <Text>
              Please contact the school admission office for onboarding, uniform,
              books, and resumption instructions.
            </Text>
          </View>

          <View style={styles.signatureRow}>
            <Text style={styles.signature}>Admission Officer</Text>
            <Text style={styles.signature}>School Stamp / Signature</Text>
          </View>

          <Text style={styles.footer}>
            Generated by School Clerk. Application reference {applicationReference || "not specified"}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
