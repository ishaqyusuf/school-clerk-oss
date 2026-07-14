# 01 — Simplify Student Import Setup Screen

**What to build:** The first import screen becomes a quiet paste-first setup UI. Operators should see a compact horizontal defaults form, the pasted student text as the dominant surface, a concise footer status, compact warning details when needed, and one clear `Proceed` action.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The setup screen shows only the compact defaults form, paste area, footer status, and primary/secondary actions by default.
- [ ] Import mode, classroom/fallback classroom, and global gender remain available and preserve existing behavior.
- [ ] Sidebar summary cards and large default warning panels are removed or collapsed from the normal setup view.
- [ ] Footer status shows parsed student rows, lines/rows needing fixes, and a clear readiness state.
- [ ] Detailed parser warnings remain available through a compact details affordance.
- [ ] `Proceed` remains disabled for empty input, missing required classroom in single mode, no parsed student rows, and blocking loading states.
- [ ] Local draft persistence and parser behavior are unchanged.
- [ ] The layout fits common mobile and desktop widths without horizontal scrolling or overlapping controls.
