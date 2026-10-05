import type { Database } from "./prisma";
import { executeStudentImportSchema, type ImportRowResult } from "@school-clerk/utils/student-import-schema";
import { requireStudentImportAccess } from "./student-import-access";
import { executeStudentImportRow } from "./student-import-execution";
import { refreshStudentImportJobProgress, settleStudentImportJobRow, type StudentImportRowOutcome } from "./student-import-job-rows";

const STUDENT_IMPORT_JOB_CHUNK_SIZE = 25;
const rowStatuses: Record<ImportRowResult["status"], StudentImportRowOutcome["status"]> = {
  created: "CREATED", kept: "KEPT", updated: "UPDATED", skipped: "SKIPPED", failed: "FAILED",
};

export async function runStudentImportJob(
  db: Database,
  jobId: string,
) {
  const job = await db.studentImportJob.findFirst({
    where: { id: jobId, deletedAt: null },
  });
  if (!job) throw new Error("Student import job was not found.");

  if (job.status !== "PENDING" && job.status !== "RUNNING") {
    const snapshot = await refreshStudentImportJobProgress(db, job.id);
    return snapshot;
  }

  try {
    await requireStudentImportAccess(db, { kind: "job", jobId: job.id });
    const started = await db.studentImportJob.updateMany({
      where: { id: job.id, deletedAt: null, status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "RUNNING", errorMessage: null },
    });
    if (started.count !== 1) {
      const snapshot = await refreshStudentImportJobProgress(db, job.id);
      return snapshot;
    }

    const pendingRows = await db.studentImportJobRow.findMany({
      where: { jobId: job.id, status: { in: ["PENDING", "RUNNING"] }, deletedAt: null },
      select: { id: true },
      orderBy: { lineNumber: "asc" },
    });

    processing: for (
      let index = 0;
      index < pendingRows.length;
      index += STUDENT_IMPORT_JOB_CHUNK_SIZE
    ) {
      const chunk = pendingRows.slice(index, index + STUDENT_IMPORT_JOB_CHUNK_SIZE);
      for (const queuedRow of chunk) {
        const receipt = await settleStudentImportJobRow(db, {
          jobId: job.id, rowId: queuedRow.id,
        }, async (tx, storedJob, storedRow) => {
          const parsed = executeStudentImportSchema.parse({ rows: [storedRow.payload] });
          const row = parsed.rows[0];
          if (!row || row.lineNumber !== storedRow.lineNumber || row.action !== storedRow.action) {
            throw new Error("Stored import row identity does not match its payload. Review before resubmitting.");
          }
          const result = await executeStudentImportRow(tx, { kind: "job", jobId: storedJob.id }, {
            schoolId: storedJob.schoolProfileId,
            sessionId: storedJob.schoolSessionId,
            termId: storedJob.sessionTermId,
          }, row, row.classroomDepartmentId || "");
          return {
            status: rowStatuses[result.status],
            studentId: result.studentId,
            termSheetCreated: result.termSheetCreated,
            reason: result.reason,
          };
        });
        if (!receipt) break processing;
      }
      await refreshStudentImportJobProgress(db, job.id);
    }
  } catch (error) {
    // Operational/access failure stops this job; committed row receipts are kept.
    await db.studentImportJob.updateMany({
      where: { id: job.id, deletedAt: null, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message.slice(0, 1_000) : "Import execution is unavailable.",
      },
    });
    await refreshStudentImportJobProgress(db, job.id);
    throw error;
  }

  const snapshot = await refreshStudentImportJobProgress(db, job.id);
  return snapshot;
}
