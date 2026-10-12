# Student form workshop

Open `index.html` directly in a browser. No server is needed. It contains three directions, direct preview links, and a larger interactive view.

1. **Inline check:** familiar student sheet with matches under the name fields.
2. **Match panel:** form beside the match list; recommended starting point.
3. **Find first:** find a student before choosing enrollment, class correction, or a new record.

## Try the behavior

- Start with Ahmad, then add Bello. Nine first-name matches become two matching all supplied name fields, with weaker matches labelled separately.
- Add Yusuf as other name to bring Ahmad Yusuf Bello to the top.
- Use Show more to reveal additional results beyond five.
- Open Edit class on Ahmad Bello. Change Primary 3 · A to Primary 4 · B and save; the match updates and the draft remains.
- Open Enroll student on Ahmad Yusuf Bello. Confirm a destination; the row becomes enrolled and offers Edit class.
- Open View record; Escape or Close dismisses the dialog.
- Try No match, then create a fictional student. Direction 03 has details and review steps.
- Reset restores the draft, records, result limit, messages, and step.

All data/actions are fictional and stay in memory within the preview. The palette and mark come from School Clerk. Finance is disabled in the sample school. Product code and real student data are unchanged.

## Verification

Headless Chrome exercised all flows above across directions 01–03. Desktop 1280px and mobile 390px/320px passed horizontal overflow checks and modal viewport bounds. Gallery switching and embedded matching passed. No uncaught page errors. Desktop and representative mobile screenshots were visually reviewed.

`01.png`–`03.png` are the desktop gallery images; `01-mobile.png`–`03-mobile.png` record mobile layouts; `comparison.png` shows the full comparison page.

Production behavior and implementation limits are recorded in `.brain/plans/2026-10-11-student-form-workshop.md`. This is a workshop, not a live-product fix or selected design.
