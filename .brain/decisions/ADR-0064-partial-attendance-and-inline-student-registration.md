# ADR-0064: Partial attendance and inline student registration

- Date: 2026-10-05
- Status: Implemented and verified in local authenticated browser
- Supersedes: ADR-0016 complete-roster write requirement only

## Decision

Attendance create and correction accept a nonempty subset of the active classroom roster. Every submitted row still requires a status and a unique, tenant-, term- and classroom-owned student term form. Unmarked students have no attendance row and are excluded from attendance-rate denominators. Corrections retain the existing replacement semantics and audit snapshots: omitted prior marks are removed from the active revision rather than inferred as absent. Duplicate-session and payload-bound idempotency guards are unchanged.

Administrators can open the existing classroom secondary student sheet from the inline attendance recorder. Reuse its registration form, fee preview and existing-student name lookup. Preselect the current classroom/session/term. Creation or enrollment closes the secondary sheet and invalidates the attendance roster and classroom counts while retaining attendance draft marks. Expand the rendered roster far enough to include a newly added student. Ordinary student-directory registration retains its existing success/payment controls.

No database schema change or schema push is required. Teacher registration permissions and workflows are unchanged.

## Validation

35 focused registration/attendance tests pass. Daarul Hadith administrator browser QA passed new-student creation, existing suggestion enrollment, preselection, immediate roster/count refresh, draft retention and a one-of-nine partial save. Numbered roster/mobile form fit 390 × 844. Birth-date Drawer selection/Cancel and desktop popover passed. Broad typecheck remains blocked by existing shared diagnostics; narrow compilation passes. Local QA records remain for review. Conditional Finance policy is documented in ADR-0065.
