# Define Download Builder Contract

Labels: `wayfinder:prototype`
Status: Resolved
Blocked by: None
Blocks: [Specify Signed Workbook Contract](specify-signed-workbook-contract.md), [Design Assessment Workbooks Workflow And RTL Review UI](design-assessment-workbooks-workflow-and-rtl-review-ui.md)

## Question

What exact interaction and selection contract should the Assessment Workbooks download builder expose before generating a one-classroom workbook?

## Context

The entry point is the Assessment Recording toolbar. Term and classroom context should be prefilled, subjects may be selected independently, each subject may include chosen scoreable assessments or one Bare Subject Column, missing-gender students block download, existing scores are included, and workbook direction defaults from Academic Data Direction with a per-download override.

## Resolve

- Define the term/classroom selector behavior and permission-filtered options.
- Define subject selection, assessment nesting, scoreable-child labels, and Bare Subject Column selection.
- Decide default selections and how users add/remove/reorder subjects and assessment columns.
- Define how duplicate visible labels, zero-weight assessments, no-assessment subjects, no students, and missing gender appear.
- Define boys'/girls' section previews and direction override behavior.
- Define loading, generation, failure, retry, and download-complete states.
- Produce a rough prototype or interaction outline for live user reaction.

## Expected Answer

An implementation-ready download-builder behavior specification and linked prototype covering controls, validation, ordering, disabled states, copy, RTL/LTR behavior, and responsive layout.

## Comments

Prototype a compact builder with prefilled term/classroom context followed by an ordered subject list. Each selected subject should choose either one Bare Subject Column or one-or-more scoreable assessments; grouped parents act only as labels for selectable children. Keep selection explicit, show boys’/girls’ roster counts, expose the Academic Data Direction override, and block generation with direct correction guidance when any student lacks gender.

## Resolution

Implemented a toolbar dialog with bound classroom/term context, one/many subject selection, per-subject scoreable columns or a mutually exclusive Bare Subject Column, and LTR/RTL override. The server blocks empty rosters and any gender outside Male/Female.
