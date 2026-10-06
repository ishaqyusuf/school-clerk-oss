# Dashboard table scrolling and selection

Updated: 2026-10-06

Full-page dashboard tables grow with the document and keep horizontal overflow
for wide columns. They do not impose a viewport-height vertical scroll area.
Student tables default to window virtualization and retain cursor loading.
The shared TableGrid also defaults to natural height; an explicit height opts
into bounded container scrolling for an embedded use case.

Classroom result review no longer caps its table height. Finance accounts,
streams, ledger and generic finance tables explicitly use horizontal overflow.
Staff, classes, transactions, fees and the other legacy lists already have
natural page height. Existing viewport-based load-more observers are retained.
Assessment recording already uses document scrolling and is unchanged here.

Standalone checkbox-only table cells share symmetric inline padding, block
checkbox centring and removal of the legacy vertical translation through
`styles/dashboard-tables.css`. Labels and checkbox groups in ordinary cells are
excluded. Shared virtual rows and selection skeleton cells center their inner
content explicitly. The rule works in both LTR and RTL without changing
shared shadcn primitives or selection actions.

Dialogs, sheets, menus and other bounded overlays retain their scroll areas.
ClassroomStudents currently appears only in the classroom overview sheet and
explicitly requests student-table container mode; window virtualization cannot
track that sheet's separate scroll position.

## Verification

In-app browser: classroom results at 1280px, 390px and 320px; 43 loaded rows,
one document scroll, table scrollTop 0, centered checkboxes, single/all selection,
indeterminate header and deselection. Staff desktop/mobile retain natural
height. Students at 390px retain virtual rows and cursor growth (table height
3645px to 5445px after scrolling).

Finance is disabled for the current local tenant. A temporary route rendered
the actual FinanceTable, streams and ledger components with 40 synthetic rows
each and the legacy table with four rows. At 390px and 1280px all wrappers had
equal client/scroll height and no nested vertical scrollbar; current/legacy
checkbox offsets were at most 0.25px. The temporary route was removed.
Finance account fetching and its infinite-loading workflow were source-audited,
not exercised against live finance data. See
`artifacts/dashboard-tables-qa/README.md` for evidence and limitations.
The classroom overview sheet was opened from report review: its student table
explicitly reported container mode and rendered 18 virtual rows before closing.

Focused unused-import lint and diff whitespace checks pass. Broad root and
dashboard typechecks retain existing React/csstype and API/generated-client
failures, including the same shared skeleton/virtual-row style diagnostics in
the pre-change logs. No database, API or permission changes.

Decision: [ADR-0073](../decisions/ADR-0073-dashboard-table-page-scroll.md).
