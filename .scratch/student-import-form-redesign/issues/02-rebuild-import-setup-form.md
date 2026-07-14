# 02 - Rebuild Import Setup Form

**What to build:** The first import screen should become a clear, operator-friendly setup form for choosing the import mode, selecting the classroom behavior, choosing optional gender defaults, pasting student data, and understanding what the parser sees before analysis starts.

**Blocked by:** 01 - Redesign Student Import Workflow Shell

**Status:** done

- [x] Import mode is presented as a standard segmented control with clear single-classroom and multi-classroom choices.
- [x] Classroom selection copy and validation change based on the selected import mode, making required versus fallback behavior obvious.
- [x] Optional global gender uses compact shadcn-style grouped controls with accessible labels and no ambiguous empty selected state.
- [x] The paste area is large, comfortable, and styled as a primary data-entry surface with readable placeholders for single-classroom and multi-classroom examples.
- [x] Parsed student count, classroom/header warnings, and validation blockers are visible near the paste area before analysis starts.
- [x] Warning and validation messages use standard alert or callout styling rather than raw monospace blocks as the primary UI.
- [x] The primary action is disabled until the pasted data, classroom requirement, and parsed row count are valid.
- [x] Parser behavior, saved draft behavior, global gender fallback behavior, and classroom-header parsing behavior remain unchanged.
- [x] The setup form fits mobile widths without controls colliding, truncating important labels, or forcing horizontal scrolling.
