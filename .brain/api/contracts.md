# QA purge contract

- Start requires a fresh ten-minute signed preview and exact
  `PURGE ALL QA DATA` confirmation.
- Live custom domains and unavailable file credentials block cleanup; status
  and durable receipts contain aggregate counts only.

# Student directory contracts

- `students.index` accepts optional `q`, `status`, `admissionTypes`, `sessionId`,
  `sessionTermId`, `enrollmentDate`, `departmentId`,
  `classroomDepartmentIds`, legacy class/title filters, `studentId`, cursor
  pagination, and a typed sort tuple.
- Explicit `sessionId` and `sessionTermId` values require an active term
  enrollment. `enrollmentDate` accepts one supported preset, one ISO calendar
  date, or an ordered inclusive ISO date range and filters
  `StudentTermForm.createdAt`. Combined period, date, classroom, and admission
  criteria match the same tenant-owned, non-deleted term form.
- Sort tuples allow only `studentName`, `gender`, `dob`, or `createdAt` followed
  by `asc` or `desc`. Page size is bounded to 1–100.
- The list returns `{ data, meta }`. Each data row includes `id`,
  `studentName`, `gender`, `dob`, `createdAt`, `department`, `departmentId`,
  `classId`, `termFormId`, `termFormSessionTermId`, `status`,
  `guardianName`, `guardianPhone`, and term-scoped `admissionType`.
- `students.bulkChangeClass` accepts at least one `studentTermFormId` plus a
  target `classroomDepartmentId` and returns `{ count }`.
- `students.bulkDeleteTermSheets` accepts at least one term-form ID and returns
  `{ count }`.
- Admission update inputs accept one or up to 100 term-form IDs plus
  `UNCLASSIFIED`, `NEW_ADMISSION`, or `RETURNING`. The mutation returns the
  number updated and fee-reconciliation summaries.
- Student creation accepts `admissionType` plus
  `selectedOptionalFeeItemIds[]`. Only audience/scope-compatible optional items
  can become charges.
- Finance-item input accepts `studentAudience` independently from
  `collectable`.
- Finance-item create/update returns the saved item plus `reconciliation` with
  `status`, `reconciledTermForms`, `failedTermFormIds`, and `retryable`.
  Current-term batches retry once; `PARTIAL` means the fee was saved and the
  listed term forms should be retried by saving again.
