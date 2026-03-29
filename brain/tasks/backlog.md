# Backlog

## Purpose
Prioritized list of tasks not yet started.

## How To Use
- Add new tasks here first.
- Keep tasks small and actionable.
- Move tasks to in-progress when work starts.

## Template
## Task Item
- ID:
- Title:
- Type: feature | bug | chore | docs
- Priority: P0 | P1 | P2 | P3
- Scope:
- Dependencies:
- Owner:

## Task Item
- ID: CORE-001
- Title: Design and implement institution type configuration
- Type: feature
- Priority: P0
- Scope: Add canonical `institutionType` enum, tenant config storage, read/write API, and validation rules.
- Dependencies: ADR-0002
- Owner: TBD

## Task Item
- ID: CORE-002
- Title: Implement module enable/disable engine per tenant
- Type: feature
- Priority: P0
- Scope: Add module flags, UI gating, API/service authorization checks, and onboarding defaults by institution type.
- Dependencies: CORE-001
- Owner: TBD

## Task Item
- ID: CORE-003
- Title: Normalize academic hierarchy model
- Type: feature
- Priority: P0
- Scope: Unify session/term/level/department/program model and align enrollment, attendance, and assessment references.
- Dependencies: CORE-001
- Owner: TBD

## Task Item
- ID: EXAM-001
- Title: Design external examination data model and module config
- Type: feature
- Priority: P1
- Scope: Define schema/entities for exam bodies, exams, candidates, subjects, centers, payments, documents, and results; add tenant module toggle support.
- Dependencies: CORE-001, CORE-002
- Owner: TBD

## Task Item
- ID: EXAM-002
- Title: Implement candidate registration workflow (single + bulk)
- Type: feature
- Priority: P1
- Scope: Build registration flow, subject selection, payment tracking, status transitions, deadline validation, and export/slip generation.
- Dependencies: EXAM-001
- Owner: TBD

## Task Item
- ID: PAY-001
- Title: Schema — add Fees.classRoomId + Wallet.source
- Type: feature
- Priority: P0
- Scope: Prisma schema changes + db push. Fees get optional classroom scope; Wallet gets source tag.
- Dependencies: none
- Owner: TBD

## Task Item
- ID: PAY-002
- Title: Stream source field (F4)
- Type: feature
- Priority: P1
- Scope: Extend createStream/getStreams tRPC + stream form UI + stream card badges.
- Dependencies: PAY-001
- Owner: TBD

## Task Item
- ID: PAY-003
- Title: Classroom & general fee scoping (F1 + F2)
- Type: feature
- Priority: P1
- Scope: Extend createSchoolFee/getSchoolFees with classRoomId; fees-management table Scope column + filter; create-fee form scope toggle.
- Dependencies: PAY-001
- Owner: TBD

## Task Item
- ID: PAY-004
- Title: Term fee setup step — import & configure (F5)
- Type: feature
- Priority: P0
- Scope: New tRPC procedures getTermFeeSetup, importFeesFromLastTerm, saveTermFeeSetup. New Fee Setup section in term-getting-started page.
- Dependencies: PAY-003
- Owner: TBD

## Task Item
- ID: PAY-005
- Title: Classroom sheet Payments tab
- Type: feature
- Priority: P1
- Scope: Activate "Coming Soon" Payments tab in classroom-overview-sheet. List applicable fees with term status + create fee button.
- Dependencies: PAY-003
- Owner: TBD

## Task Item
- ID: PAY-006
- Title: Student fee status query + student sheet enhancement (F3)
- Type: feature
- Priority: P1
- Scope: New getStudentFeeStatus tRPC procedure. Enhance StudentTransactionOverview with fee status section (not configured / uninitialized / initialized) + Initialize All action.
- Dependencies: PAY-003
- Owner: TBD

## Task Item
- ID: PAY-007
- Title: Bulk class fee initialization (I1)
- Type: feature
- Priority: P1
- Scope: bulkInitializeClassFees tRPC procedure. Button in classroom sheet Payments tab + term fee setup step.
- Dependencies: PAY-006
- Owner: TBD

## Task Item
- ID: PAY-008
- Title: Student payment portal page (F6)
- Type: feature
- Priority: P1
- Scope: New /finance/student-payment-portal page. Student search, multi-term fee summary, initialization status per term, cross-term payment routing.
- Dependencies: PAY-006
- Owner: TBD

## Task Item
- ID: PAY-009
- Title: Cross-term payment routing in applyPayment (F6d)
- Type: feature
- Priority: P1
- Scope: Extend applyPayment with optional paymentWalletTermId so previous-term fees are paid into current term's stream.
- Dependencies: PAY-008
- Owner: TBD

## Task Item
- ID: PAY-010
- Title: Carryover balance indicator (I3)
- Type: feature
- Priority: P2
- Scope: Flag students with pendingAmount > 0 from previous terms in student list, student sheet header, and payment portal search results.
- Dependencies: PAY-008
- Owner: TBD

## Task Item
- ID: EXAM-003
- Title: Implement external result tracking and analytics
- Type: feature
- Priority: P2
- Scope: Add result capture/import, candidate result history, pass-rate analytics, and score distribution dashboards.
- Dependencies: EXAM-002
- Owner: TBD
