# Assessment Results and Sub-Assessments

## Goal
Make classroom assessment recording, classroom result review, student result printouts, and PDF result generation consistent when assessments can be standalone items or grouped into sub-assessments.

## Users
- School admins configure assessment structures and print rules.
- Teachers record student scores.
- Result/report users review classroom score tables.
- Parents receive printed/PDF student results.

## Flow
- Standalone assessments are scoreable directly.
- Grouped parent assessments are containers and should not receive direct student scores.
- Sub-assessment children under a grouped parent are scoreable.
- Recording screens should show scoreable items, including sub-assessment children.
- Student result print/PDF should show printable weighted columns only.
- Grouped assessments should support two print modes:
  - Expanded: print weighted child columns as `Parent - Child`.
  - Total only: print one parent column using the summed weighted child scores.

## Data Model
- Existing fields:
  - `ClassroomSubjectAssessment.isGroup` marks grouped parent rows.
  - `ClassroomSubjectAssessment.parentAssessmentId` links child rows to a parent.
  - `ClassroomSubjectAssessment.percentageObtainable` is the report/print weight.
  - `ClassroomSubjectAssessment.obtainable` is the raw score maximum.
  - `ClassroomSubjectAssessment.index` controls display order.
- Target field:
  - `printMode` for grouped parent assessments, with values such as `expanded` and `total`.
- Optional future field:
  - `printOnResult` if schools need to hide a weighted item from print without setting weight to zero.

## APIs
- `assessments.getClassroomReportSheet` should return subjects for the selected classroom and selected term.
- Result/report queries should preserve assessment order by `index`.
- Report data should expose enough structure to distinguish standalone assessments, grouped parents, and children.
- Score recording mutations should only update scoreable assessments.
- Assessment mutation routes should verify child ownership before updating or deleting child IDs.

## UI/UX Notes
- Assessment form should show a grouped-assessment print mode control:
  - Print sub-assessments
  - Print group total only
- Standalone assessments with no weight should show a warning: they can be recorded but will not print.
- Grouped assessments whose children have no printable weight should show a warning: the group will not appear on printed results.
- Assessment list should show badges for:
  - No print
  - Print expanded
  - Print total only
  - 0% weight
- Printable labels should include parent context for expanded child columns, for example `Exam - Oral`.
- A print preview inside the assessment manager should show the exact columns that will appear on result printouts.

## Print Rules
- Standalone assessment with `percentageObtainable > 0`: print as a column.
- Standalone assessment with no weight or zero weight: do not print as a column.
- Grouped parent assessment: never print as a directly scored parent row.
- Grouped assessment with `printMode = expanded`: print weighted children only.
- Grouped assessment with `printMode = total`: print one parent total column if summed child weight is greater than zero.
- Child assessment with no weight or zero weight: do not print as a column.
- Recording/classroom review may still show zero-weight scoreable items when they are useful for internal tracking.

## Recommended PDF Patterns
- Default parent-facing PDF should prefer grouped total-only columns for clean output.
- Expanded columns should be available when schools want parents to see each sub-assessment.
- Summary-first printout is preferred for polished reports:
  - Student/class/term header
  - Overall total, percentage, position, comment
  - Subject breakdown
  - Detailed scores

## Edge Cases
- A grouped parent with no children is invalid.
- A grouped parent with children whose total weight is zero is valid for recording but should not print.
- Duplicate visible printable labels should be warned against or prevented.
- Editing weights after scores exist should warn that printed totals will be recalculated.
- Deleted assessments are soft-deleted; restore support is a future improvement.
- Empty score means no score, not zero.
- Obtained score above obtainable should warn or be blocked depending on school policy.

## Metrics
- Count of printable assessment columns per subject.
- Count of scoreable items per subject.
- Count of zero-weight/no-print items.
- Total printable weight per subject.
- Number of result printouts generated after assessment structure changes.

## Open Questions
- Should subject rows with no printable assessments be hidden from printed student results or shown as blank subjects?
- Should total subject printable weight be required to equal 100%, or only warned when it does not?
- Should zero-weight assessments remain visible in classroom result review, or only in recording screens?
- Should `printMode` default to `total` or `expanded` for grouped assessments?
