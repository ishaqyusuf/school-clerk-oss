# 04 - Redesign Import Row Cards

**What to build:** Each review row should become a compact, scan-friendly card that lets operators resolve one student without hunting through dense controls. The card should clearly show row status, parsed name parts, classroom, gender, action decision, match candidates, existing-student search, and row-level import state.

**Blocked by:** 03 - Create Review Command Center

**Status:** done

- [x] Row cards have a consistent header with checkbox, line number, match kind, row status, gender state, and classroom state.
- [x] Parsed name parts are shown as editable shadcn controls or compact fields that preserve the current name-split selection behavior.
- [x] Arabic and RTL names remain readable in display, dropdown, search, and candidate areas.
- [x] Missing gender and missing/ambiguous classroom states are visually distinct and expose direct controls to resolve them.
- [x] Action selection clearly communicates which choices require an existing match candidate and disables invalid choices.
- [x] Match candidates show name, classroom, term/session status, confidence/reason, and selected state in a compact selectable pattern.
- [x] Existing-student search is available without expanding every row by default and can promote a selected student into the match-found flow.
- [x] Single-row import has clear idle, importing, imported, and failed states without affecting unrelated staged rows.
- [x] Row card mobile layout keeps controls reachable and avoids squeezed text, overlapping badges, or horizontal scrolling.
- [x] Current row decision defaults, manual gender overrides, classroom reassignment, name edit suggestions, search promotion, skip rules, and single-row execution semantics remain unchanged.
