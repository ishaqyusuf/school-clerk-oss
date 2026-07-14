# 02 — Extract Review Readiness And Count Model

**What to build:** A clear readiness and counting model for the reviewed import rows. The model should compute row sections, checked-row readiness, executable counts, blocked counts, skipped counts, unchecked counts, and disabled import reasons without changing parser, verification, or execution contracts.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Rows can be classified into needs-attention, match-found, and ready-to-import sections from existing verification and row-decision state.
- [ ] Footer counts are computed from checked rows, including checked total, checked executable, checked blocked, unchecked, and skipped rows.
- [ ] Unchecked attention rows remain counted as unchecked and do not block batch import.
- [ ] Checked rows missing gender, classroom, action, or required match candidate produce deterministic disabled reasons.
- [ ] No checked executable rows disables start import with a clear reason.
- [ ] Existing skipped-row and execution-payload semantics are preserved.
- [ ] Extracted helpers/selectors are covered by focused tests where practical.
