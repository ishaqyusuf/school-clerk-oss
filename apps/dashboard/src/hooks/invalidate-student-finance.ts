import type { QueryClient } from "@tanstack/react-query";
import type { useTRPC } from "@/trpc/client";

export function invalidateStudentFinanceQueries(queryClient: QueryClient, trpc: ReturnType<typeof useTRPC>, result: {
  studentIds: string[]; termFormIds: string[];
}) {
  for (const studentId of result.studentIds) {
    void queryClient.invalidateQueries({ queryKey: trpc.students.overview.queryKey({ studentId }) });
    void queryClient.invalidateQueries({ queryKey: trpc.students.academicsOverview.queryKey({ studentId }) });
    void queryClient.invalidateQueries({ queryKey: trpc.academics.getStudentTermsList.queryKey({ studentId }) });
  }
  for (const id of result.termFormIds) {
    void queryClient.invalidateQueries({ queryKey: trpc.students.getTermFormDetails.queryKey({ id }) });
  }
  const keys = [
    trpc.students.getTermFormDetails.queryKey(),
    trpc.students.index.infiniteQueryKey(), trpc.students.analytics.queryKey(), trpc.students.duplicateGroups.queryKey(),
    trpc.academics.getPromotionStudents.queryKey(), trpc.search.global.queryKey(),
    trpc.finance.overview.queryKey(), trpc.finance.getWorkspaceSummary.queryKey(),
    trpc.finance.getAccounts.queryKey(), trpc.finance.getAccountDetails.queryKey(),
    trpc.finance.getStreams.queryKey(), trpc.finance.getStreamDetails.queryKey(),
    trpc.finance.getCharges.queryKey(), trpc.finance.getStudentStatement.queryKey(),
    trpc.finance.getReceivePaymentData.queryKey(), trpc.finance.getReceivePaymentOptions.queryKey(),
    trpc.finance.getCollectionSummary.queryKey(), trpc.finance.getCollectionStudents.queryKey(),
    trpc.finance.getFinanceReports.queryKey(), trpc.finance.getFinanceIntegrityReport.queryKey(),
    trpc.finance.getTermLedger.queryKey(), trpc.finance.previewTermClose.queryKey(),
    trpc.finance.getTermAccountStatement.queryKey(), trpc.finance.getProjectAccountSummary.queryKey(),
    trpc.finance.getStudentPurchaseSuggestions.queryKey(), trpc.finance.searchStudentsForPayment.queryKey(),
  ];
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
  void queryClient.invalidateQueries({ queryKey: trpc.students.studentsRecentRecord.queryKey() });
  void queryClient.invalidateQueries({ queryKey: trpc.students.classChangeOptions.queryKey() });
  void queryClient.invalidateQueries({ queryKey: trpc.assessments.getClassroomReportSheet.queryKey() });
  void queryClient.invalidateQueries({ queryKey: trpc.assessments.getPrintStatus.queryKey() });
  void queryClient.invalidateQueries({ queryKey: trpc.attendance.getAttendanceRoster.queryKey() });
  void queryClient.invalidateQueries({ queryKey: trpc.attendance.getAttendanceReport.queryKey() });
  void queryClient.invalidateQueries({ queryKey: trpc.attendance.getStudentAttendanceHistory.queryKey() });
}
