# 03 — Replace Review Tabs With Sectioned Table Shell

**What to build:** The review screen becomes one scrollable table-like surface instead of tabbed row cards. Operators should see `Needs attention`, `Match found`, and `Ready to import` sections in one continuous scroll, with slim section headers, counts, and row containers ready for the new row interaction model.

**Blocked by:** 02 — Extract Review Readiness And Count Model.

**Status:** ready-for-agent

- [ ] Review tabs are replaced by a single scrollable review body.
- [ ] Sections appear in this order: needs attention, match found, ready to import.
- [ ] Each section header shows title, total count, checked count, and useful section-level selection controls where appropriate.
- [ ] Empty sections use compact empty states without reintroducing tab navigation.
- [ ] Row containers use a table/grid structure with columns for checkbox, student/name details, match summary, selected action, and more actions.
- [ ] Gender, classroom, line number, and blocker status are accommodated in the row subtitle/badge area rather than many extra columns.
- [ ] Desktop and mobile layouts avoid horizontal scrolling and overlapping text.
