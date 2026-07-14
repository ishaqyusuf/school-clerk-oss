Status: ready-for-agent

# Student Import Flat Sectioned Redesign Spec

## Problem Statement

The current student import flow works, but the UI has become too heavy for the operator's main task: paste a batch of student names, quickly see whether anything needs fixing, resolve the few important rows, and start the import. The setup screen includes extra visual structure, summary cards, and detailed warnings that compete with the pasted text. The review screen uses tabs and row cards, which forces operators to jump between categories and scan a lot of controls row by row.

From the school operator's perspective, student import should feel like a focused data cleanup workflow. The first screen should be quiet and paste-first. The review screen should read like one sectioned table where attention rows, matched rows, and ready rows are all visible in a single scroll. Operators should be able to trust the footer status, uncheck rows they are not ready to fix, and import only the checked rows that are executable.

## Solution

Redesign the dashboard student import modal into a minimal two-stage workflow while preserving the existing parser, verification, matching, name editing, row decisions, execution, and async import job contracts.

The setup stage should contain only a compact horizontal defaults form, the pasted student text, a small status footer, and a `Proceed` action. The footer should summarize parsed rows, lines or rows needing fixes, and the current readiness state with simple color/status treatment. Detailed parser warnings should not dominate the screen by default; they can be available through compact detail affordances when needed.

The review stage should replace tabs and row cards with one scrollable sectioned table. Sections should appear in priority order: `Needs attention`, `Match found`, and `Ready to import`. Each section has a slim header and its own rows, but the whole review is one continuous scroll surface. Rows are checked by default, and the review footer computes readiness only from checked rows. `Start import` is disabled only when checked rows still need fixes, selected actions, selected match candidates, gender, or classroom assignment.

Each review row should make the common path obvious: checkbox, student name with editable name chips and status subtitle, closest match summary, selected action dropdown, and more-actions menu. The match summary should show the closest or selected match, confidence, and `+N more` when multiple candidates exist. Selecting the match area should open a candidate picker where the operator can compare and select a match. Less common tools such as search existing student, reset name edits, secondary name-structure editing, skip, and optional single-row import should live behind secondary actions.

## User Stories

1. As a school operator, I want the import setup screen to focus on the pasted student text, so that I can prepare a batch without visual noise.
2. As a school operator, I want import mode, classroom behavior, and global gender to appear in one compact defaults row, so that setup does not take over the screen.
3. As a school operator, I want the defaults row to distinguish single-classroom and multi-classroom imports, so that I understand whether classroom selection is required or only a fallback.
4. As a school operator, I want global gender to remain optional, so that I can use it only when it applies to the pasted batch.
5. As a school operator, I want the paste area to stay large and central, so that long student lists are comfortable to enter and edit.
6. As a school operator, I want the setup footer to show parsed student rows, so that I know whether the system understood my paste.
7. As a school operator, I want the setup footer to show lines or rows needing fixes, so that I know whether I can proceed.
8. As a school operator, I want warning details available without always showing a large warning panel, so that the screen stays calm unless I need details.
9. As a school operator, I want the proceed button disabled when the setup is truly blocked, so that I do not reach review with no valid rows.
10. As a school operator, I want classroom loading and name-guide loading states to be clear, so that I understand why proceeding may be temporarily unavailable.
11. As a school operator, I want my pasted draft to remain saved locally while the modal is open or reopened, so that accidental closing does not lose work.
12. As a school operator, I want review to appear as one scrollable table, so that I do not jump between tabs to understand the batch.
13. As a school operator, I want rows needing attention at the top, so that I fix blockers first.
14. As a school operator, I want matched rows grouped together, so that duplicate or existing-student decisions are easy to scan.
15. As a school operator, I want ready rows grouped together, so that I can confirm the rows that will import cleanly.
16. As a school operator, I want each section header to show total and checked counts, so that I know how much of that section is selected for import.
17. As a school operator, I want section-level check and uncheck controls where useful, so that I can quickly exclude a group from import.
18. As a school operator, I want all rows checked by default, so that normal imports require fewer clicks.
19. As a school operator, I want to uncheck rows I am not ready to fix, so that unresolved rows do not block the rest of the import.
20. As a school operator, I want unchecked attention rows to remain visible, so that I can return to them later without forgetting them.
21. As a school operator, I want the review footer to show checked rows, executable rows, blocked checked rows, unchecked rows, and skipped rows, so that the import status is trustworthy.
22. As a school operator, I want the import button to enable only when checked rows are executable, so that I cannot accidentally submit an incomplete selection.
23. As a school operator, I want unchecked blocked rows not to disable import, so that I can import the rows I have finished resolving.
24. As a school operator, I want each row to show a checkbox first, so that row inclusion is always visible.
25. As a school operator, I want the student name cell to show first name, surname, and other name as small editable chips, so that name-structure fixes are fast.
26. As a school operator, I want clicking a name chip to reuse the current name-structure options, so that existing name splitting behavior is preserved.
27. As a school operator, I want the row subtitle to show line number, classroom, gender, and blocker status, so that I can understand the row without opening a card.
28. As a school operator, I want missing gender to be visibly fixable in the row, so that attention rows can become executable.
29. As a school operator, I want missing or ambiguous classroom assignment to be visibly fixable in the row, so that multi-classroom imports stay safe.
30. As a school operator, I want the match column to show the closest match and confidence, so that likely duplicates are obvious.
31. As a school operator, I want the match column to show when more candidates exist, so that I know when to inspect alternatives.
32. As a school operator, I want clicking the match summary to open candidate details, so that I can compare candidates without leaving the table.
33. As a school operator, I want candidate details to include name, classroom, term/session status, same-classroom status, reason, and confidence, so that I can choose the right existing student.
34. As a school operator, I want selected match candidates to be clearly marked, so that action decisions depending on a match are safe.
35. As a school operator, I want exact matches to default to the safe current action, so that common duplicate cases do not require extra work.
36. As a school operator, I want suspected matches to require explicit resolution when needed, so that uncertain matches are not silently applied.
37. As a school operator, I want the action dropdown to show the row's current action, so that import-new, keep-match, and update-name decisions are visible.
38. As a school operator, I want invalid actions disabled or clearly explained, so that I know why an action needs a selected candidate.
39. As a school operator, I want lower-frequency row tools in a more-actions menu, so that the table does not become crowded.
40. As a school operator, I want to search and select an existing student from secondary actions, so that manually found matches remain possible.
41. As a school operator, I want to reset row edits from secondary actions, so that accidental changes are reversible.
42. As a school operator, I want skip to remain available only where valid, so that ready no-match rows are not accidentally omitted.
43. As a school operator, I want single-row import to remain available only if it does not clutter the main table, so that urgent one-row fixes stay possible without harming the batch workflow.
44. As a school operator, I want execution progress and completion summaries to keep the current reliable behavior, so that the redesign does not weaken large import processing.
45. As a school operator, I want failed rows after execution to remain readable by line number and reason, so that I can fix problems later.
46. As a school operator, I want the completed import state to offer clear close and start-new-import actions, so that I can finish or begin another batch.
47. As a keyboard user, I want row checkboxes, name chips, match picker, action dropdown, and more menu to be reachable by keyboard, so that the import is accessible.
48. As a keyboard user, I want focus to return predictably after closing a match picker or menu, so that I do not lose my place in a long table.
49. As a mobile operator, I want the review table to stack gracefully without horizontal scrolling, so that I can resolve imports on narrow screens.
50. As a developer, I want this redesign to preserve parser, verification, execution, and async job contracts, so that the work stays focused on UI and state composition.
51. As a developer, I want row readiness and footer counts to be computed by clear helper logic, so that the import gating rules are testable and maintainable.
52. As a developer, I want the redesign documented in Brain after implementation, so that future agents understand the new workflow.

## Implementation Decisions

- Preserve the existing student import parser semantics, classroom-header parsing, gender inference, matching rules, row decision semantics, execution mutation, and durable background import job contracts.
- Treat this as a dashboard UI composition and state-gating redesign, not a database, API, or matching-algorithm change.
- Keep the setup stage minimal: compact horizontal defaults form, paste input, status footer, and one proceed action.
- Remove or collapse the current setup sidebar summary cards from the default experience.
- Collapse detailed parser warnings from the default layout into footer status plus compact optional details.
- Use parsed student rows as the primary setup count, with raw non-empty lines available as secondary context when helpful.
- Keep the setup proceed button disabled for empty input, missing required classroom in single-classroom mode, no parsed student rows, and blocking loading states.
- Use a single scrollable review body rather than tabs.
- Order review sections by operator priority: needs attention, match found, ready to import.
- Keep rows checked by default.
- Base review footer counts and import gating only on checked rows.
- Allow unchecked attention rows to remain visible without blocking batch import.
- Keep skipped rows omitted from execution payloads and counted separately.
- Keep the row table visually simple with columns for checkbox, student/name details, match summary, selected action, and more actions.
- Put line number, gender, classroom, and blocker status in the name cell subtitle or compact badges rather than adding many narrow table columns.
- Render `name`, `surname`, and `otherName` as compact editable chips that preserve the existing name-structure selection behavior.
- Provide name-structure editing through both the visible chips and secondary row actions where useful.
- Show the closest or selected match in the match column, including confidence and a `+N more` indicator for additional candidates.
- Use an accessible candidate picker for match details and selection. On narrow screens, the picker may become a sheet or inline expansion instead of a cramped popover.
- Keep candidate metadata consistent with the current match UI: display name, classroom, term/session status, same-classroom status, confidence, and reason.
- Keep the action dropdown visible as a first-class row control.
- Disable or explain candidate-dependent actions when no existing candidate is selected.
- Move lower-frequency row actions into a more-actions menu: search existing student, reset edits, secondary name-structure editing, skip where valid, and optional single-row import.
- Preserve current verification error normalization, pre-submit error behavior, async job polling, result summaries, cache invalidation, and start-new-import/close actions.
- Prefer extracting clear helper/selectors for row sectioning, row readiness, footer counts, candidate summary, and action validity before rewriting large JSX surfaces.
- Brain documentation must be updated after implementation, especially the student import feature documentation.

## Testing Decisions

- Primary test seam: the dashboard student import flow from setup parsing through review gating and execution-start readiness. This is the highest useful seam because the redesign is mostly UI composition and row state behavior.
- Preserve existing parser tests because parser behavior is explicitly out of scope and must not regress.
- Preserve import error normalization tests because transport and execution errors must continue to display safely.
- Add or update tests around row readiness/count helpers if those helpers are extracted.
- Test that checked rows drive footer counts and import button state.
- Test that unchecked attention rows do not block batch import.
- Test that checked rows missing gender, classroom, action, or required match candidate do block batch import.
- Test that no checked executable rows disables start import.
- Test that valid checked executable rows produce the same execution payload semantics as before.
- Browser QA should cover setup states, valid and blocked paste data, single-classroom mode, multi-classroom mode, no-match rows, exact matches, suspected matches with multiple candidates, missing gender, missing or ambiguous classroom, action changes, candidate selection, async job progress, completion, and mobile layout.
- Accessibility QA should cover keyboard navigation for row checkboxes, name chips, action dropdown, more menu, candidate picker, focus return, and screen-reader labels for row status.
- Tests should assert visible behavior and execution payload readiness, not private component state or exact internal helper names.

## Out of Scope

- Changing student import parser semantics.
- Changing classroom-header parsing rules.
- Changing gender inference rules.
- Changing fuzzy matching or confidence rules.
- Changing student import API contracts.
- Changing durable import job database schema or worker processing.
- Adding migrations.
- Reworking the broader student list page outside the import modal.
- Adding CSV or spreadsheet upload.
- Replacing the student import execution result model.
- Rebuilding the whole dashboard design system.

## Further Notes

- The redesign should keep the current operator safety properties while reducing visible friction.
- The implementation should be careful not to remove recovery paths that already exist, such as manual gender, classroom reassignment, name-structure reset, search-promoted match, and single-row failure handling.
- The existing `Start import` behavior uses durable background jobs for batch execution; this should remain the default batch path.
- Brain documentation is part of done for implementation. At minimum, update the student import feature doc after the UI lands. API docs should only change if implementation unexpectedly changes contracts.
