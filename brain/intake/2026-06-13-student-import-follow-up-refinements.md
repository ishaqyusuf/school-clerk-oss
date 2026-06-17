# Brain Intake: Student Import Follow-Up Refinements

## Status
Proposed

## Created Date
2026-06-13

## Last Updated
2026-06-13

## Raw Input
Student batch import follow-up refinements:
- When `,` or `.` is present in the name, split the name by that punctuation; otherwise split by spaces. Trim all parts and filter empty members before assigning `[firstName, surname, otherName]`.
- Gender should use a shadcn grouped button control with `[m]` and `[f]`.
- Print/display name parts as separate chips or badges: `[firstName] [lastName] [otherName]`.
- If no match is found, the `[skip]` action should be disabled.
- When there is no conflict action, `Import new` should be selected by default.
- Add a cancel import feature.

## Generated Plans
- [ ] Student Import Follow-Up Refinements - `brain/plans/2026-06-13-ux-ui-student-import-follow-up-refinements.md` - Status: Proposed

## Recommended Execution Order
1. Student Import Follow-Up Refinements - this is one cohesive pass through the existing student import modal and review UI, with a small parser adjustment feeding the same display and action-default behavior.

## Agent Recommendations
- Student Import Follow-Up Refinements: open-code - focused dashboard component work with a narrow parser change and no expected database migration.

## Merged Items
- Delimiter-aware name splitting, name-part badge display, gender button controls, default action behavior, disabled skip behavior, and cancel import were merged into one plan because they all affect the existing student import modal/review workflow and can be verified together.

## Duplicate Or Existing Items
- Existing feature docs already state that ready rows with no match default to `Import new`; this intake keeps that as an explicit verify-or-repair requirement because the user repeated it.
- Existing review UI docs already include row-level `Skip`; this intake narrows the rule so `Skip` is disabled for no-match rows.
- Existing parser docs already split names by whitespace and use comma for row gender; this intake changes the delimiter priority and should update the documented input contract after implementation.

## Needs Clarification
- None. If preserving row-level gender aliases after comma-separated name parts conflicts with the new delimiter rule, implement the least surprising behavior by keeping explicit `[m]`/`[f]` UI selection as the primary gender input and documenting any remaining row-level gender parsing behavior.

## Skipped Items
- None.

## Approval Notes
- None.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.
