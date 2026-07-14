# 05 — Route Dashboard Batch Execution Through Import Jobs

**What to build:** Change the dashboard batch import execution path so selected multi-row imports start a durable import job and show progress, while single-row import remains fast on the existing direct execution path. The operator should click the same batch execute action and see a progress-focused import state instead of waiting on one large HTTP mutation.

**Blocked by:** 02 — Create Student Import Job Start And Status Contract; 03 — Process Student Import Jobs In Trigger.dev.

**Status:** done

- [x] The batch execute action submits executable checked rows to the import job start contract.
- [x] The dashboard disables duplicate batch submission while an import job is pending or running.
- [x] The import analysis panel shows persisted job progress with processed/total rows.
- [x] The progress UI shows created students, kept matches, updated matches, term sheets created, skipped rows, and failed rows.
- [x] Completed jobs trigger the same relevant dashboard query refreshes as successful direct execution.
- [x] Single-row import still uses direct execution and keeps its existing line-level success/error behavior.
- [x] Existing recoverable import error display handles job-start/status failures with safe diagnostics.
- [x] Dashboard tests or focused component coverage verify start, running, completed, and failed-progress states from the user's perspective.
