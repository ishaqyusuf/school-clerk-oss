# Student Overview

## Status
Implemented: 2026-04-03

## Overview
Student details now render through a shared overview shell that works in both contexts:
- the existing student sheet
- a dedicated student details page at `/students/[studentId]`

The shared shell keeps the same overview, academics, attendance, and payments features while reusing one header, one tab rail, and one provider-driven term selection model.

## Key Files

| File | Purpose |
|------|---------|
| `apps/dashboard/src/hooks/use-student-overview-sheet.ts` | Host-aware provider for sheet and page modes |
| `apps/dashboard/src/components/students/student-overview-shell.tsx` | Shared header + tabs + tab-content shell |
| `apps/dashboard/src/components/students/student-overview-sheet-header.tsx` | Reusable profile header card |
| `apps/dashboard/src/components/students/student-overview.tsx` | Overview tab layout |
| `apps/dashboard/src/components/sheets/student-overview-sheet.tsx` | Sheet host using the shared shell |
| `apps/dashboard/src/components/students/student-overview-page-client.tsx` | Page host using the shared shell |
| `apps/dashboard/src/app/dashboard/[domain]/(sidebar)/students/[studentId]/page.tsx` | Student overview page route |

## UX Notes
- The UI is based on the sample in `ai-studio-sample/schoolclerk-admin/pages/StudentOverview.tsx`.
- Shared surfaces use semantic shadcn-style tokens like `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-primary/10` to preserve theme support.
- The page host adds breadcrumb chrome while the sheet host keeps the compact scrollable sheet container.
- The shell uses one tab state model per host, so sheet interactions do not leak into the page view and page interactions do not require sheet query params.

## Data Behavior
- Overview data still comes from `students.overview`.
- The provider resolves the active term from `studentTerms`, preferring the selected term and otherwise falling back to the latest enrolled term.
- Sheet mode syncs term selection back into `studentViewTermId` and `studentTermSheetId`.
- Page mode keeps its own local tab and term state, which allows attendance, finance, academics, and overview components to work outside the sheet.
