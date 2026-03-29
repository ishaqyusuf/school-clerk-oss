# School Payment System

## Status
Planning complete — awaiting implementation go-ahead.

## Overview
A comprehensive payment system covering classroom-scoped and general fee structures, term-based fee configuration, student payment initialization, stream source tagging, and a student payment portal.

---

## Key Data Model Insight

Fees are **term-based via a two-layer model**:

```
Fees (template)
  └─→ FeeHistory (term-specific activation + amount)
        └─→ StudentFee (per-student instance, initialized from FeeHistory)
              └─→ StudentPayment → WalletTransaction → Wallet (stream)
```

- A `Fees` record is a reusable template (scoped to school or classroom)
- A fee is only **active for a term** if a `FeeHistory` record exists for that `termId`
- A fee is **initialized for a student** only when a `StudentFee` record exists linking `feeHistoryId + studentTermFormId`
- Three distinct states per fee per student:
  1. **Not configured** — `Fees` template exists, no `FeeHistory` for this term
  2. **Configured but not initialized** — `FeeHistory` exists, no `StudentFee` for this student
  3. **Initialized** — `StudentFee` exists (may have `pendingAmount > 0`)

---

## Full Setup Flow

```
Term created
    ↓
Term Getting-Started wizard → "Fee Setup" step
    ├── List all Fees templates (general + per classroom)
    ├── "Import from last term" → pre-fill amounts from previous FeeHistory
    ├── Admin sets/confirms amount per fee → creates FeeHistory records
    └── Fees are now "term-configured"

Student enrolled (StudentTermForm created)
    ├── Option A: Auto-initialize at enrollment time
    └── Option B: Manual via student sheet → "Initialize Fees"
            → creates StudentFee records from FeeHistory
                ↓
            Student pays → StudentPayment → WalletTransaction → Wallet (stream)
```

---

## Features

---

### F1 — Classroom Payment Structures

**Goal**: Fee templates scoped to a specific classroom (e.g. JSS1 = ₦50k, SS3 = ₦80k).

**Schema change**:
```prisma
model Fees {
  // ...existing fields
  classRoomId String?
  classRoom   ClassRoom? @relation(fields: [classRoomId], references: [id])
}

model ClassRoom {
  // ...existing fields
  fees Fees[]
}
```
Fees with `classRoomId = null` are general (school-wide). Fees with `classRoomId` are classroom-specific.

**tRPC changes** (`transaction.routes.ts`):
- Extend `createSchoolFee` input: add optional `classRoomId`
- Extend `getSchoolFees` input: add optional `classRoomId` filter
- Add `getClassroomFees({ classRoomId, termId })` → returns classroom fees + general fees, filtered by FeeHistory for term

**UI**:
- Classroom sheet → "Payments" tab (currently "Coming Soon") → list applicable fees with term status
- "New Fee" button in that tab pre-fills `classRoomId`
- Fees-management table: add "Scope" column showing "General" or classroom name

---

### F2 — General Payment Structures (Enhancement)

**Goal**: Improve visibility and management of school-wide fees.

**Changes**:
- Fees-management table: "Scope" column — "General" or classroom name
- Create-fee form: "Scope" toggle — General or select a classroom
- Fees-management filter: All / General / per classroom
- FeeHistory status badge per term: "Configured" / "Not Configured for this term"

---

### F3 — Student Form: Payment List + Apply Options

**Goal**: Student sheet "Payments" tab shows ALL applicable fees with initialization status and inline actions.

**New tRPC procedure**: `transaction.getStudentFeeStatus({ studentTermFormId })`

Logic:
1. Get student's `ClassRoom` via `StudentTermForm → ClassRoomDepartment → ClassRoom`
2. Get all `Fees` where `classRoomId = null OR classRoomId = student's classRoomId`
3. Get `FeeHistory` for those fees in current term
4. Get `StudentFee` records for this `studentTermFormId`
5. Return three buckets:
   - `notConfigured`: Fees with no FeeHistory for this term
   - `uninitialized`: FeeHistory exists but no StudentFee for this student
   - `initialized`: StudentFee exists (with pendingAmount, billAmount)

**UI enhancement** (StudentTransactionOverview "Fee Structure" section):
- Each fee row: name, amount, status badge
  - "Not Configured" (grey) — fee not set up for this term
  - "Not Initialized" (yellow) → "Initialize" button → calls `createStudentFee`
  - "Initialized" (green) — shows pendingAmount; if > 0 → inline "Pay" button
- "Initialize All" bulk button for uninitialized fees
- Existing Apply Payment form stays beneath

---

### F4 — Stream Form: Source Field

**Goal**: Tag each stream (Wallet) as student or staff sourced for P&L visibility.

**Schema change**:
```prisma
model Wallet {
  // ...existing fields
  source String? // "student" | "staff" | null
}
```

**tRPC changes**:
- Extend `createStream` input: add optional `source`
- `getStreams` returns `source` field

**UI**:
- Create stream form: "Source" selector — Student Payments / Staff Payroll / General
- Stream cards: source badge
- Future: auto-route student payments to `source: "student"` wallet

---

### F5 — Term Configuration: Fee Import Step

**Goal**: When configuring a new term (via term getting-started wizard), allow admins to activate and import fees for that term in one step.

**Where**: `/academic/term-getting-started/[id]` — add "Fee Setup" tab/step.

**New tRPC procedures**:
- `transaction.getTermFeeSetup({ termId })` → all `Fees` templates grouped by scope, each with FeeHistory status for this term (configured / not configured) and last-term amount for reference
- `transaction.importFeesFromLastTerm({ termId, sourceTermId? })` → clones `FeeHistory` from previous term into new term (auto-detects source term if omitted); returns created records for review/edit before confirm
- `transaction.saveTermFeeSetup({ termId, fees: [{ feeId, amount }][] })` → bulk upsert `FeeHistory` records for the term

**UI** (term getting-started page — new "Fee Setup" section):
- Table: fee name, scope (General/Classroom), last term amount, this term amount (editable)
- "Import from Last Term" button — pre-fills amounts, admin adjusts
- "Save Fee Setup" confirms → creates/updates `FeeHistory` records
- Status indicator: X fees configured, Y classrooms covered

---

### F6 — Student Payment Portal

**Goal**: Dedicated page `/finance/student-payment-portal` for full cross-term student payment management.

**Sub-features**:

**6a. Student Search**
- Search by name/ID
- Result cards: name, current class, total outstanding across all terms

**6b. Multi-Term Fee Summary**
- List all `StudentTermForm` records for the student
- Per term: term name, session, total invoiced, total paid, outstanding balance
- Badges: "Current Term" / "Previous" / "Outstanding"

**6c. Initialization Status Per Term**
- Selected term: list applicable fees (general + classroom)
- Per fee: "Initialized" / "Not Initialized" with Initialize button
- "Initialize All for Term" batch action

**6d. Cross-Term Payment Routing**
- When paying a previous term's outstanding fee, the `WalletTransaction` credits the **current active term's** fee wallet (correct stream accounting)
- `StudentFee.pendingAmount` on the previous term reduces correctly
- Implementation: `applyPayment` accepts optional `paymentWalletTermId` param

**New tRPC procedures**:
- `transaction.getStudentAllTermsAccounting({ studentId })` → all terms with fee summaries + initialization status
- `transaction.initializeStudentFees({ studentTermFormId, feeHistoryIds? })` → bulk or selective initialization
- Extend `transaction.applyPayment` → add optional `paymentWalletTermId`

---

## Suggested Improvements

### I1 — Bulk Class Initialization
"Initialize all students in [Class] for current term" — single action creates `StudentFee` records for all enrolled students in a classroom.

`transaction.bulkInitializeClassFees({ classRoomDepartmentId, termId })`

Useful button in: classroom sheet Payments tab + term getting-started Fee Setup step.

### I2 — Auto-Initialize on Enrollment
When `StudentTermForm` is created, automatically run fee initialization against active `FeeHistory` for that term. Eliminates manual initialization for new enrollments.

### I3 — Carryover Balance Indicator
Students with `pendingAmount > 0` from any previous term are flagged in:
- Student list table (badge)
- Student sheet header
- Student payment portal search results

### I4 — Payment Receipt PDF
After payment processed, "Print Receipt" button generates PDF via `@school-clerk/pdf`.

### I5 — Stream Auto-Routing
Student payments auto-route to fee wallet tagged `source: "student"`. Payroll auto-routes to `source: "staff"`. Reduces manual wallet selection.

---

## Implementation Order

| Step | Feature | Type | Scope |
|------|---------|------|-------|
| 1 | Schema: `Fees.classRoomId` + `Wallet.source` | DB | Migration |
| 2 | F4: Stream source field (form + display) | tRPC + UI | Small |
| 3 | F1+F2: Classroom & general fee scoping | tRPC + UI | Medium |
| 4 | F5: Term fee setup step (import + configure) | tRPC + UI | Medium |
| 5 | Classroom sheet Payments tab | UI | Small |
| 6 | F3: `getStudentFeeStatus` + student sheet enhancement | tRPC + UI | Medium |
| 7 | I1: Bulk class fee initialization | tRPC + UI | Small |
| 8 | F6: Student payment portal page | tRPC + UI | Large |
| 9 | F6d: Cross-term payment routing in `applyPayment` | tRPC | Small |
| 10 | I3: Carryover balance indicator | UI | Small |

---

## Files to Touch

**Schema**:
- `packages/db/src/schema/student-activity.prisma` — add `classRoomId` to `Fees`
- `packages/db/src/schema/finance.prisma` — add `source` to `Wallet`

**tRPC**:
- `apps/api/src/trpc/routers/transaction.routes.ts` — new procedures
- `apps/api/src/trpc/routers/finance.routes.ts` — extend stream procedures
- `apps/api/src/db/queries/accounting.ts` — new query functions

**Pages**:
- `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/finance/student-payment-portal/page.tsx` — new
- `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/academic/term-getting-started/[id]/` — add fee setup section

**Components**:
- `apps/dashboard/src/components/students/student-transaction-overview.tsx` — add fee status section
- `apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx` — activate Payments tab
- `apps/dashboard/src/components/forms/school-fee-form.tsx` — add classRoomId + scope selector
- `apps/dashboard/src/components/accounting-streams.tsx` — add source field to stream form
