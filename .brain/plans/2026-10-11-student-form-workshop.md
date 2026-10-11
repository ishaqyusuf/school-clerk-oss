# Student form suggestions workshop — 2026-10-11

## Status and scope

Requested three-direction workshop delivered and browser-verified. The owner selected 01 Inline check on 2026-10-11 and requested implementation, a default-checked search toggle, collapse, testing and production release. Implementation and verification status are tracked in `2026-10-11-student-form-implementation.md`; production release is pending. The unrelated design-system workshop remains independent.

## Problem grounded in source

- `apps/dashboard/src/components/forms/student-form.tsx` watches only `name` and passes it to `FindAndEnroll` before the surname/other-name fields.
- `apps/dashboard/src/components/find-and-enroll.tsx` queries `students.index` with `status: "not enrolled"` and `size: 5`, without a continuation affordance. Already-enrolled students are excluded. Rows offer Enroll, but no class correction.
- The student directory read model already resolves scoped class/status; the shared class-change boundary is documented in ADR-0055. A selected implementation should reuse existing authorized reads and mutations rather than bypass their ownership, lifecycle, role, and term rules.

## Artifact

- Comparison and larger interactive view: `artifacts/student-form-workshop/index.html`.
- Direct directions: `preview.html?direction=1`, `preview.html?direction=2`, `preview.html?direction=3` in the same folder.
- Shared CSS/JS, fictional sample records, desktop/mobile screenshots, and manual verification notes in that folder.
- Static files open directly from disk. No development/preview server, dependency installation, real API access, database action, deployment, or secret changes were required.

## Directions

| ID | Direction | Structure | Tradeoff |
| --- | --- | --- | --- |
| 01 | Inline check | Existing sheet, all name fields together, match list underneath | Familiar and compact in width; adds vertical scrolling |
| 02 | Match panel | Wide form on left with independent results on right; names, matches, then details on mobile | More identity-verification space; wider desktop surface |
| 03 | Find first | Find existing student, or choose new record → details → review | Clear decision before registration; extra step for new students |

All directions use the current School Clerk green/ivory tokens and brand mark, Kingsway Academy, First Term 2026/2027, and identical fictional records. Finance is disabled in the sample school. This keeps fee/payment design outside the comparison without implying removal from Finance-enabled schools.

## Shared proposed behavior

- Suggestions react to first name, surname, and optional other name. Matching every supplied name field takes precedence over clearly labelled partial matches.
- Nine first-name matches can be revealed with Show more. Counts and displayed/total feedback prevent a silent five-record cap.
- Include enrolled and not-enrolled students across classes in the school. Enrolled rows display current-term class/stream; historical class is labelled Last class with its period.
- DOB, guardian, and student ID support identity verification; matching a name never automatically identifies the person.
- Enrolled rows offer Edit class and View record. Not-enrolled rows offer Enroll student and View record.
- Class correction shows student, source class, current term, destination, and an explicit save. The prototype preserves the registration draft and updates only local sample data.
- Copy preserves ADR-0055 semantics: changing class does not recalculate existing fees or remap scores/attendance links. Production must retain its existing validation and permissions.
- Reset clears draft, sample class/enrollment changes, result expansion, temporary messages/timers, dialogs, and wizard step.

This prototype simulates a small prefix-matching dataset. It is not a specified production search algorithm, an API contract, or evidence that the live form is fixed. Loading, network failure, concurrency, role restrictions, larger datasets, tenant scope changes, RTL and Finance-enabled integration remain implementation work after a choice.

## Verification

Isolated headless Chrome opened the files directly, exercised all three directions, and passed:

- First-name suggestions, surname refinement, other-name refinement, strong/partial ordering, more than five results.
- Class correction, destination no-op disabling, draft retention, existing-record enrollment, View record, Escape dismissal, and Reset restoration.
- No-match state and local creation; direction 03 details/review/create sequence.
- 1280px desktop and 390px/320px horizontal overflow checks; modal viewport bounds.
- Gallery switching and embedded preview interaction. No uncaught page errors.

Desktop previews and representative mobile screenshots were visually inspected. This is workshop QA, not live-product acceptance or a complete accessibility audit. Broad product builds/typechecks were not applicable because no app/package code changed.

## Brain impact

Added this plan and a completion entry in `.brain/tasks/done.md`. Production feature, API, schema, permission, and ADR documents retain their current behavior because no production behavior or durable choice changed.
