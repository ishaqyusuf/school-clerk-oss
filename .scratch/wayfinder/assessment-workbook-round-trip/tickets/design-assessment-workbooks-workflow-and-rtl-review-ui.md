# Design Assessment Workbooks Workflow And RTL Review UI

Labels: `wayfinder:prototype`
Status: Resolved
Blocked by: [Define Download Builder Contract](define-download-builder-contract.md), [Design Import Verification And Conflict Algorithm](design-import-verification-and-conflict-algorithm.md), [Define Bare Subject Resolution And Assessment Creation Transaction](define-bare-subject-resolution-and-assessment-creation-transaction.md)
Blocks: [Define Verification And Rollout Matrix](define-verification-and-rollout-matrix.md)

## Question

What complete Assessment Workbooks interface lets authorized users download, upload, resolve, review, and confirm safely across desktop/mobile and LTR/RTL academic data?

## Context

The primary entry point is the Assessment Recording toolbar. The workflow has Download and Upload paths, always requires review, reuses Academic Data Direction, preserves English application chrome, and needs clear status for bare columns, invalid scores, conflicts, stale rows, missing gender, permissions, and exact write counts.

## Resolve

- Decide modal, sheet, or dedicated-page structure and URL/state persistence.
- Integrate the approved download-builder contract.
- Define upload dropzone/file-picker, initial verification, rejection, retry, and replacement states.
- Design review sections, filters, status counts, cell-level details, and conflict resolution.
- Design Bare Subject Column link/create controls.
- Define confirmation gating, exact-impact summary, progress, success, partial-system-failure, and retry states.
- Apply scoped academic RTL to record data and workbook preview while keeping English actions and machine values LTR.
- Define keyboard navigation, focus management, screen-reader labels, color-independent states, and narrow-screen behavior.
- Produce a prototype for live user review.

## Expected Answer

An implementation-ready UI/interaction specification and linked prototype for the entire workflow, including component boundaries, responsive behavior, accessibility, and RTL/LTR examples.

## Comments

Prototype the workflow as a wide global sheet or dedicated workspace rather than a small dialog. Keep Download and Upload as clear modes, with upload progressing through file selection, verification, resolution, review, and confirmation. Reuse `AcademicDataDirectionProvider` for academic tables and workbook preview, preserve English controls and numeric values as LTR, use `dir="auto"` for names/labels, and provide filters for blockers, conflicts, changed scores, and bare columns.

## Resolution

Implemented a wide responsive dialog with Download and Upload modes, file replacement, live identity/summary, Bare Subject Column controls, blocker copy, exact change table, and guarded apply. It inherits the scoped academic direction and uses automatic direction for academic names/labels.
