import type { DatabaseTransaction } from "./prisma";
import { Prisma, type StudentImportJob, type StudentImportJobRow } from "./generated/client";
import type { Database } from "./prisma";
import { requireStudentImportAccess, StudentImportAccessError } from "./student-import-access";

export type StudentImportRowOutcome = {
  status: "CREATED" | "KEPT" | "UPDATED" | "SKIPPED" | "FAILED";
  studentId?: string | null;
  termSheetCreated?: boolean;
  reason?: string | null;
};

function isActiveJob(job: StudentImportJob) {
  return job.status === "PENDING" || job.status === "RUNNING";
}

function isTerminalRow(row: StudentImportJobRow) {
  return row.status !== "PENDING" && row.status !== "RUNNING";
}

async function lockJob(tx: DatabaseTransaction, jobId: string) {
  const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM "StudentImportJob"
    WHERE id = ${jobId} AND "deletedAt" IS NULL FOR UPDATE
  `);
  const job = locked.length === 1
    ? await tx.studentImportJob.findFirst({ where: { id: jobId, deletedAt: null } })
    : null;
  if (!job) throw new StudentImportAccessError("NOT_FOUND", "Student import job is unavailable.");
  return job;
}

async function lockRow(tx: DatabaseTransaction, jobId: string, rowId: string) {
  const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM "StudentImportJobRow"
    WHERE id = ${rowId} AND "jobId" = ${jobId} AND "deletedAt" IS NULL FOR UPDATE
  `);
  const row = locked.length === 1
    ? await tx.studentImportJobRow.findFirst({ where: { id: rowId, jobId, deletedAt: null } })
    : null;
  if (!row) throw new StudentImportAccessError("NOT_FOUND", "Student import row is unavailable.");
  return row;
}

function saveOutcome(tx: DatabaseTransaction, row: StudentImportJobRow, outcome: StudentImportRowOutcome) {
  return tx.studentImportJobRow.update({
    where: { id: row.id },
    data: {
      status: outcome.status,
      studentId: outcome.studentId ?? null,
      termSheetCreated: outcome.termSheetCreated ?? false,
      reason: outcome.reason?.slice(0, 1_000) ?? null,
      completedAt: new Date(),
    },
  });
}

const legacyRunningReason = "This row was left RUNNING by an older worker and may already have changed student records. Review the student, enrollment and fees before submitting a new row; it was not replayed.";

/** Internal worker boundary. The callback must use only this transaction for all writes. */
export async function settleStudentImportJobRow(
  db: Database,
  target: { jobId: string; rowId: string },
  execute: (tx: DatabaseTransaction, job: StudentImportJob, row: StudentImportJobRow) => Promise<StudentImportRowOutcome>,
): Promise<StudentImportJobRow | null> {
  try {
    return await db.$transaction(async (tx) => {
      // All new row writers and progress snapshots use job -> row lock order.
      const job = await lockJob(tx, target.jobId);
      if (!isActiveJob(job)) return null;
      const row = await lockRow(tx, job.id, target.rowId);
      await requireStudentImportAccess(tx, { kind: "job", jobId: job.id });
      if (isTerminalRow(row)) return row;
      if (row.status === "RUNNING") {
        return saveOutcome(tx, row, {
          status: "FAILED", reason: legacyRunningReason,
          studentId: row.studentId, termSheetCreated: row.termSheetCreated,
        });
      }

      const outcome = await execute(tx, job, row);
      // A failed business result must roll back any earlier callback writes too.
      if (outcome.status === "FAILED") throw new Error(outcome.reason || "Import row could not be completed.");
      return saveOutcome(tx, row, outcome);
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 60_000 });
  } catch (error) {
    // The first commit may have succeeded despite an uncertain response. Read its
    // receipt under fresh locks before saving failure; never execute the row here.
    return db.$transaction(async (tx) => {
      const job = await lockJob(tx, target.jobId);
      if (!isActiveJob(job)) return null;
      const row = await lockRow(tx, job.id, target.rowId);
      if (isTerminalRow(row)) return row;
      await requireStudentImportAccess(tx, { kind: "job", jobId: job.id });
      return saveOutcome(tx, row, {
        status: "FAILED",
        studentId: row.studentId,
        termSheetCreated: row.termSheetCreated,
        reason: row.status === "RUNNING" ? legacyRunningReason
          : error instanceof Error ? error.message : "Import row could not be completed. Review before resubmitting.",
      });
    }, { isolationLevel: "ReadCommitted", maxWait: 10_000, timeout: 60_000 });
  }
}

/** A consistent snapshot relative to row writers; never revives a terminal job. */
export async function refreshStudentImportJobProgress(db: Database, jobId: string) {
  return db.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    const rows = await tx.studentImportJobRow.findMany({
      where: { jobId, deletedAt: null }, orderBy: { lineNumber: "asc" },
    });
    const summary = {
      processedRows: 0, createdStudents: 0, keptMatches: 0, updatedMatches: 0,
      termSheetsCreated: 0, skippedRows: 0, failedRows: 0,
    };
    for (const row of rows) {
      if (!isTerminalRow(row)) continue;
      summary.processedRows += 1;
      if (row.termSheetCreated) summary.termSheetsCreated += 1;
      switch (row.status) {
        case "CREATED": summary.createdStudents += 1; break;
        case "KEPT": summary.keptMatches += 1; break;
        case "UPDATED": summary.updatedMatches += 1; break;
        case "SKIPPED": summary.skippedRows += 1; break;
        case "FAILED": summary.failedRows += 1; break;
      }
    }
    let status = job.status;
    let errorMessage = job.errorMessage;
    if (isActiveJob(job)) {
      if (rows.length !== job.totalRows) {
        status = "FAILED";
        errorMessage = "Stored import row count changed. Review the job before resubmitting.";
      } else if (summary.processedRows === job.totalRows) {
        status = summary.failedRows > 0 ? "COMPLETED_WITH_FAILURES" : "COMPLETED";
      } else {
        status = "RUNNING";
      }
    }
    const updatedJob = await tx.studentImportJob.update({
      where: { id: job.id }, data: { status, errorMessage, ...summary },
    });
    return { job: updatedJob, rows };
  }, { isolationLevel: "ReadCommitted", maxWait: 10_000, timeout: 60_000 });
}
