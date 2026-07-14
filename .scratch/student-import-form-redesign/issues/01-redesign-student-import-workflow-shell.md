# 01 - Redesign Student Import Workflow Shell

**What to build:** The student import experience should open into a polished shadcn workflow shell that feels like a focused import workspace rather than a dense modal. Operators should see a stable header, clear step/status navigation, an isolated scroll body, and predictable primary/secondary actions while the existing import behavior remains intact.

**Blocked by:** None - can start immediately.

**Status:** done

- [x] The import surface has a stable header with the workflow title, short contextual description, and close/cancel behavior that matches current routing behavior.
- [x] Setup, review, and execution states are visually represented as clear workflow steps or status areas without changing the underlying import state machine.
- [x] The body is the only large scroll region; header, step/status navigation, and footer actions remain stable on desktop and mobile.
- [x] Footer actions clearly separate primary progression from secondary cancellation/reset actions.
- [x] The implementation uses standard shadcn-based project primitives for dialog/sheet, buttons, tabs or step controls, separators, badges, alerts, and progress indicators.
- [x] Existing query-param open/close behavior, local draft persistence, parsing trigger, verification trigger, and execution trigger continue to work.
- [x] The layout remains usable at narrow mobile widths and wide desktop widths with no overlapping controls or clipped action text.
- [x] Keyboard focus order starts at the workflow title/first actionable control and remains logical through setup, review, and execution states.
