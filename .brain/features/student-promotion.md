# Student Promotion Feature

## Status
Implemented: 2026-03-16

## Overview
Full "session roll-over" flow: create a new academic session with smart prefills, then batch-promote students from the last term of the previous session into the first term of the new session.

## User Flow

```
Academic Dashboard
  "Create New Session" / "Start Roll-over Wizard"
      ↓ opens AcademicSessionSheet
  Enhanced Session Form
      • Prefilled title (2024/2025 → 2025/2026)
      • "Initialize with Terms" toggle → auto-populates 3 terms with +1 year dates
      ↓ on success → auto-switches active session cookie
  /academic/promotion/[lastTermId]/[firstNewTermId]
  Promotion Page
      • Stats row: Total / Promoted / Pending / Avg Score
      • Filterable table: search, class, status
      • Per-student: avg score (click → performance modal)
      • Bulk: Promote Selected / Promote All
      • Per-student: Promote / Reverse
```

## Key Routes

| Route | File |
|-------|------|
| `/academic` | `(sidebar)/academic/(dashboard)/page.tsx` |
| `/academic/promotion/[lastTerm]/[firstTerm]` | `(sidebar)/academic/promotion/[lastTerm]/[firstTerm]/page.tsx` |

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/trpc/routers/academics.routes.ts` | 5 new/updated procedures |
| `apps/api/src/db/queries/academic-terms.ts` | `createAcademicSession` returns `{ sessionId, sessionTitle, terms }` |
| `apps/dashboard/src/components/forms/academic-session-form.tsx` | Prefill + initWithTerms + redirect |
| `apps/dashboard/src/app/.../(dashboard)/page.tsx` | Fixed broken button handlers |
| `apps/dashboard/src/app/.../promotion/[lastTerm]/[firstTerm]/page.tsx` | Server page |
| `apps/dashboard/src/app/.../promotion/[lastTerm]/[firstTerm]/promotion-client.tsx` | Interactive client |
| `apps/dashboard/src/app/.../promotion/[lastTerm]/[firstTerm]/student-performance-modal.tsx` | Score modal |
| `apps/dashboard/src/hooks/use-student-overview-sheet.ts` | Syncs the student sheet's active term params with promoted/enrolled term records from `students.overview` |

## tRPC Procedures

| Procedure | Type | Purpose |
|-----------|------|---------|
| `academics.getSessionPrefill` | query | Last session title/dates shifted +1 year |
| `academics.createAcademicSession` | mutation | Updated: returns `{ sessionId, sessionTitle, terms }` |
| `academics.getPromotionStudents` | query | Students from last term + isPromoted flag + avg score |
| `academics.getStudentTermPerformance` | query | Full subject breakdown for modal |
| `academics.batchPromote` | mutation | Create StudentSessionForm + StudentTermForm per student |
| `academics.reversePromotion` | mutation | Soft-delete StudentTermForm |

## Data Models Used
- `SchoolSession` → has `terms: SessionTerm[]`
- `SessionTerm` → has `termForms: StudentTermForm[]`
- `StudentTermForm` → links student to term + classroom department + assessment records
- `StudentSessionForm` → links student to session (parent of term forms)
- `StudentAssessmentRecord` → assessment scores per student per term

## Session Auto-Switch
On successful session creation, the active session cookie is immediately updated via `switchSessionTerm()` (server action from `auth-cookie.ts`). This ensures the new session context is active before reaching the promotion page.

## Promotion Logic
- `batchPromote`: For each student, find or create `StudentSessionForm` for the new session, then create `StudentTermForm` for the first term. Idempotent (skips if already promoted).
- `reversePromotion`: Soft-deletes `StudentTermForm` (sets `deletedAt = now()`). Leaves `StudentSessionForm` intact.

## Student Overview Integration
- The student overview sheet now derives its active term from `students.overview.studentTerms` and syncs `studentViewTermId` plus `studentTermSheetId` back into query state.
- This prevents promoted students from being shown as "not enrolled for this term" when the UI opens with stale or empty term params.
