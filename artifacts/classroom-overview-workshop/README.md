# Classroom overview workshop

Three interactive, mobile-first directions for the classroom overview sheet.

- **01 Quiet tabs:** a compact class/term header, quiet text tabs, and a list-first student roster. Other sections stay visible; the rail scrolls on narrow phones.
- **02 Focus view:** a section picker replaces the rail. Most content space and least visual competition on mobile; other sections require opening the picker.
- **03 Class home:** a section menu plus a quick attendance action. Useful orientation and clear drill-down/back navigation; one additional step to the roster.

Recommendation: 02 Focus view. This is a suggestion, not an accepted production design.

## Hosted workshop

https://school-clerk-classroom-directions.ishaqyusuf024.chatgpt.site

Private to the owner through ChatGPT sign-in. The landing page links directly to each direction and includes a larger interactive preview. Source is in `site/dist/`; the independent Site source repository and identity are in `site/.git` and `site/.openai/hosting.json`.

Initial deployment succeeded on 2026-10-11:

- Project: `appgprj_6acbf1d78b5c81919290e47f359368cd`
- Site source commit: `563151246a43dd4b605e96393e9d1ae2214302ff`
- Version: `appgprj_6acbf1d78b5c81919290e47f359368cd~appgver_3472479920e8819194538fc8a63c23ad`
- Deployment: `appgdep_6acbf32fd19c8191a3942c883e22b49d`

## Sample behavior

All directions use the same fictional Kingsway Academy, First Term 2026/2027, classes, roster, subjects, and student charges. Existing green/ivory School Clerk tokens and brand mark are retained. Performance remains Coming soon. No live API, auth service, student record or school payment is called by the prototype.

Class selection preserves the section and clears stale attendance marks/search. Search filters by name or student ID. Student details open in a dismissible dialog. Add student changes only the current sample roster and count. Attendance supports Present/Absent/Late, toggling a mark off, mark-all, partial saving, and session inspection. Reset restores all rosters, marks, sessions, query, class and navigation state, dismisses dialogs, and clears temporary messages/timers. Each standalone preview/iframe has isolated memory state.

The expanded revision replaces simplified student/subject popups with secondary workspaces. Student click includes term selection, four tabs, focused profile edit and management actions. Subject click includes assessment configuration, sub-assessments, print modes, ordering, deletion and score entry. Classroom payments include four totals and generic/student-prefilled recording. All actions mutate only fictional data. The sample add form is not a replacement for the existing registration workflow.

Full source-audit and interaction coverage is published at `/coverage.html`. Bulk student actions, duplicate merge previews, real registration matching/fee previews, deeper finance, attendance scope/remarks/correction/deletion/export, workbook/public-link/report integrations and authorization states are source-only. The audit does not claim full functional parity or live-product testing.

## Verification

JavaScript syntax checks pass for `gallery.js`, `workshop.js` and `flows.js`. Local link/asset existence and SVG parsing pass. Native Sites confirms the archive-backed private deployment succeeded. Browser testing at 390 × 844 reached the private sign-in gate. Local `file:` navigation is blocked by browser policy; no alternate file access was attempted. ChatGPT consent in signed-in Chrome is awaiting explicit approval after automatic review rejected basic profile sharing. Content interaction/visual verification is pending. Chrome consent was read again after revision and remains pending; no profile-sharing action was retried.

Revision deployment succeeded with source commit `994c803bd47099d502bd8246d4ac4d63aeab6204`, version `appgprj_6acbf1d78b5c81919290e47f359368cd~appgver_44a88afe22108191be51c3e5ecb16512`, deployment `appgdep_6acbfaf270688191ae54e835853579a4`.

No application development server, production application deployment, dependency installation or secret edits were needed. Only this workshop's independent Site source was committed and pushed. Existing uncommitted monorepo work is preserved.
