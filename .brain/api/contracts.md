# QA purge contract

- Start requires a fresh ten-minute signed preview and exact
  `PURGE ALL QA DATA` confirmation.
- Live custom domains and unavailable file credentials block cleanup; status
  and durable receipts contain aggregate counts only.

# Academic metadata contracts

- `academics.updateSessionMetadata` lets an academic Admin rename a
  tenant-owned session and update or clear its optional start/end dates.
- `academics.updateTermMetadata` lets an academic Admin rename `DRAFT`,
  `READY`, or `ACTIVE` terms. Draft/ready metadata updates may also change or
  clear dates and an explicitly supplied note; omitting `note` preserves the
  stored note. Active-term calendar metadata is locked, and `CLOSED` term
  metadata remains immutable.
- Session and term titles are unique case-insensitively within their existing
  tenant/session scope. End dates cannot precede start dates.

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
- Student creation accepts `admissionType`, `selectedOptionalFeeItemIds[]`,
  `feePayments[]` (`feeItemId`, `amount`), and shared `paymentDetails`
  (`method`, optional `reference` and `paymentDate`). Only
  audience/scope-compatible fee items can become charges or receive payments.
- Positive fee payments require payment details, may contain each fee item at
  most once, and must not exceed the matching generated charge. Required and
  selected optional fees without a payment amount remain pending.
- Student creation returns `feePaymentSummary` with `paymentIds`, `count`,
  `totalAssigned`, `totalAllocated`, and `remainingBalance`. Student, term
  enrollment, charges, payments, allocations, and ledger entries commit
  atomically.
- Finance-item input accepts `studentAudience` independently from
  `collectable`, plus `studentGenderAudience` independently from both.
- Fee preview, automatic assignment, reconciliation, configured payment
  options, and direct configured-item payments all intersect the student's
  `Male`/`Female` value with `ALL_GENDERS`, `MALE_ONLY`, or `FEMALE_ONLY`.
- `students.changeStudentGender` and gender changes through
  `students.updateStudentBasicProfile` update the canonical student and
  reconcile every complete tenant-owned term form in one transaction. Newly
  applicable required fees are created and only unpaid no-longer-applicable
  managed charges are cancelled.
- Student payment-import verification and execution enforce the same admission
  and gender audiences before suggesting, selecting, or posting a configured
  finance item.
- Finance-item create/update returns the saved item plus `reconciliation` with
  `status`, `reconciledTermForms`, `failedTermFormIds`, and `retryable`.
  Current-term batches retry once; `PARTIAL` means the fee was saved and the
  listed term forms should be retried by saving again.
