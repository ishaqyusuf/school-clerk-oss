# Classroom overview workshop — 2026-10-11

## Scope and state

Owner requested three simple, clean directions for the classroom overview sheet and a hosted page for mobile review. Three interactive directions are built and deployed as a private Site. Browser content acceptance is pending ChatGPT consent approval. No direction is accepted for production implementation.

## Source grounding

`apps/dashboard/src/components/sheets/classroom-overview-sheet.tsx` uses a primary/secondary sheet, classroom selector, session badge, repeated class description, student count, unfilled Attendance/Class Avg header metrics, and five horizontal tabs. Students/Subjects/Attendance/Payments integrate their existing domain surfaces; Performance remains a placeholder. The roster uses bounded container scrolling as documented in `features/dashboard-tables.md`. The class switch preserves the current section and clears stale secondary/session details as documented in `features/attendance.md`.

## Directions

| ID | Name | Layout | Tradeoff |
| --- | --- | --- | --- |
| 01 | Quiet tabs | Single compact class/term header, text tab rail, list-first content | Familiar; rail scrolls on small phones |
| 02 | Focus view | Single compact class/term header and section picker | More content space; other sections require one extra tap |
| 03 | Class home | Classroom menu, attendance shortcut, focused drill-down with Back | Easy orientation; extra tap to reach the roster |

Recommendation is 02 Focus view for mobile. It is not a durable design decision. All directions hold palette, brand, fictional class content and section semantics constant. Unfilled global header metrics are removed from the study; no real metric or API behavior is changed.

## Artifact and publication

- `artifacts/classroom-overview-workshop/README.md`: tradeoffs, source, behavior, QA limitations and deployment identifiers.
- `artifacts/classroom-overview-workshop/site/dist/index.html`: gallery, captions, direct links and larger live preview.
- `preview.html?direction=1`, `preview.html?direction=2`, `preview.html?direction=3`: actual-size interactive studies.
- Hosted URL: https://school-clerk-classroom-directions.ishaqyusuf024.chatgpt.site
- Owner-private Site `appgprj_6acbf1d78b5c81919290e47f359368cd`; native deployment succeeded.
- Source is committed/pushed only to the independent Site source repository; the school-clerk main repository was not committed/pushed.

## Demonstrated behavior

Class switching, roster search, local add, section navigation, student/subject secondary workspaces, assessment configuration and score entry, payment recording, attendance marking/partial save/session review and full reset. No live school services or school data are accessed. Performance remains Coming soon. Existing Finance availability and role restrictions must be retained if a direction is implemented. Sample forms/detail views do not redefine feature/API contracts.

## Verification

JavaScript syntax checks pass. Archive-backed private deployment is confirmed succeeded. Browser at 390 × 844 reached the owner sign-in gate. Signed-in Chrome reached the consent screen, but automatic approval review rejected the profile-sharing action; explicit approval is pending. Content/mobile/desktop interaction QA remains open, rather than being claimed complete. Browser security blocks local file navigation; no workaround was attempted.

## Brain impact

This plan records the deliverable and outstanding QA. Production feature, API, permission, database and ADR documents require no change because only an isolated study is hosted and no implementation choice has been accepted. A completion task entry will be added after the requested workshop and applicable verification are complete.

## Existing-feature audit and revision — 2026-10-11

Owner asked whether student clicks, subject clicks, assessments and the existing
feature surface had all been checked. The first workshop was incomplete:
student and subject clicks opened simplified detail dialogs and assessment
workflows were missing. These were source-audited and the core drill-down
paths are now present in all three directions.

- Student row → shared overview with default Academics, term selection and
  Overview/Academics/Attendance/Payments. The revised study also models focused
  identity edit, class change, term removal and archive confirmations.
- Subject row → secondary subject workspace. The study models subject creation,
  batch import, assessment create/edit/suggestion/delete/reorder, grouped children,
  expanded/total-only report columns, 0% uncapped informational items, and
  scoreable-item selection with bounded non-negative numeric entry including zero.
- Classroom Payments → four totals and generic/student-prefilled receipt capture
  paths. Sample payments change only local balances; no actual payment is made.
- Source coverage also identifies bulk student actions, duplicate merge previews,
  registration/enrollment matching, fee previews, attendance scope/period/remarks,
  corrections/deletion/export, workbook verification/import, public-link lifecycle,
  report printing, deeper finance and authorization/module states. These remain
  **source-only** and are explicitly listed on the hosted coverage page.
- The separate empty assessment pane and unlabeled recordings tab in the current
  subject secondary source are documented as existing placeholder/label issues;
  clear labels in the study do not claim to fix the live source.

Hosted coverage: https://school-clerk-classroom-directions.ishaqyusuf024.chatgpt.site/coverage.html
Local implementation: `site/dist/flows.js`, secondary workspace markup/CSS,
and the coverage page. Fictional students have unique IDs across sample classes.

Revision publication succeeded:

- Source commit: `994c803bd47099d502bd8246d4ac4d63aeab6204`
- Version: `appgprj_6acbf1d78b5c81919290e47f359368cd~appgver_44a88afe22108191be51c3e5ecb16512`
- Deployment: `appgdep_6acbfaf270688191ae54e835853579a4`

All three JS syntax checks, local link/asset existence, SVG parsing and Site diff
whitespace checks pass. Native Sites confirms deployment succeeded. Chrome still
shows the ChatGPT profile consent page; consent was not retried. Browser content
interaction/mobile/desktop QA and live-product acceptance remain unverified.
There is no claim that every feature works or that backend/role behavior was tested.
