# QA purge contract

- Start requires a fresh ten-minute signed preview and exact
  `PURGE ALL QA DATA` confirmation.
- Live custom domains and unavailable file credentials block cleanup; status
  and durable receipts contain aggregate counts only.

# Student directory contracts

- `students.index` accepts optional `q`, `status`, `sessionId`,
  `sessionTermId`, `departmentId`, `classroomDepartmentIds`, legacy class/title
  filters, `studentId`, cursor pagination, and a typed sort tuple.
- Sort tuples allow only `studentName`, `gender`, `dob`, or `createdAt` followed
  by `asc` or `desc`. Page size is bounded to 1–100.
- The list returns `{ data, meta }`. Each data row includes `id`,
  `studentName`, `gender`, `dob`, `createdAt`, `department`, `departmentId`,
  `classId`, `termFormId`, `termFormSessionTermId`, `status`,
  `guardianName`, and `guardianPhone`.
- `students.bulkChangeClass` accepts at least one `studentTermFormId` plus a
  target `classroomDepartmentId` and returns `{ count }`.
- `students.bulkDeleteTermSheets` accepts at least one term-form ID and returns
  `{ count }`.
