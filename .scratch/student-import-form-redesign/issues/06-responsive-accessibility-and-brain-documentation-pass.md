# 06 - Responsive, Accessibility, And Brain Documentation Pass

**What to build:** Complete the redesign with responsive QA, accessibility cleanup, design-system consistency, focused regression checks, and Brain documentation updates that describe the new student import UX.

**Blocked by:** 01 - Redesign Student Import Workflow Shell; 02 - Rebuild Import Setup Form; 03 - Create Review Command Center; 04 - Redesign Import Row Cards; 05 - Polish Execution And Completion States

**Status:** done-with-browser-smoke-blocked

- [ ] Desktop and mobile manual QA confirms the setup, review, row-resolution, single-row import, batch execution, success, partial-failure, and cancel/reset flows are usable.
- [x] Keyboard navigation, focus-visible styling, aria labels, disabled states, and dialog/sheet focus trapping work across the full import flow.
- [x] Text wraps cleanly in buttons, badges, alerts, tabs, row cards, dropdowns, and completion summaries.
- [x] Color usage follows the shadcn token system and avoids one-off color styling where project primitives already provide semantic variants.
- [x] No UI elements overlap, shift unexpectedly, or require horizontal scrolling at common mobile and desktop sizes.
- [x] Existing parser tests and import error tests still pass, and the narrowest relevant dashboard typecheck or lint command is run.
- [x] Brain documentation records the redesigned import setup, review, row-resolution, and completion UX.
- [x] Task or progress Brain documentation records that the redesign ticket set was completed, or explains any remaining rollout gap.
- [x] Any unresolved design or verification risk is documented in the completion notes.

**Implementation note:** Code-level validation passed, and the local dashboard/API dev stack responded through Portless. In-app browser automation could not attach because the bundled browser bridge fails during bootstrap with `TypeError: Cannot redefine property: process`, before any tab can be selected.
