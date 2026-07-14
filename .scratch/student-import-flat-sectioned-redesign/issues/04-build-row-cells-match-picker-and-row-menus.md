# 04 — Build Row Cells, Match Picker, And Row Menus

**What to build:** Each sectioned review row exposes the simplified interaction model: editable name chips, closest-match summary, candidate picker, visible action dropdown, and secondary row menu. The operator can still resolve gender, classroom, name structure, match selection, search-promoted matches, resets, and valid skip/single-row actions.

**Blocked by:** 03 — Replace Review Tabs With Sectioned Table Shell.

**Status:** ready-for-agent

- [ ] Name, surname, and other name render as compact editable chips that preserve existing name-structure selection behavior.
- [ ] Row subtitle/badges show line number, classroom, gender, and blocker status clearly.
- [ ] Match summary shows the selected or closest candidate, confidence, and `+N more` when additional candidates exist.
- [ ] Match summary opens an accessible candidate picker with candidate name, classroom, term/session status, same-classroom status, reason, confidence, and selected state.
- [ ] Candidate picker remains usable on narrow screens through a suitable sheet, inline expansion, or responsive equivalent.
- [ ] Action dropdown shows the current row action and disables or explains invalid candidate-dependent actions.
- [ ] More-actions menu includes lower-frequency tools such as search existing student, update name structure, reset row edits, skip where valid, and optional single-row import.
- [ ] Missing gender and missing/ambiguous classroom fixes are directly reachable from blocked rows.
- [ ] Existing row decision defaults and manual override semantics are preserved.
