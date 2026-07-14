# 02 — Create Student Import Job Start And Status Contract

**What to build:** Add a persisted student import job contract so a reviewed batch can be submitted for durable background execution and read back by the dashboard. The operator should be able to start an import job and immediately see a pending/running-style status record with totals, ownership, active school/session/term context, and zeroed progress counters.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] A reviewed import payload can be submitted to create a tenant-scoped import job.
- [x] Job creation validates active school, session, term, and all referenced classroom departments before persisting the job.
- [x] The job records who started it, the active tenant, active session, active term, total rows, and initial aggregate counters.
- [x] Row payloads or normalized row work items are persisted so background execution does not depend on browser state.
- [x] A dashboard/API status read returns job status, progress counters, row result summaries when available, and safe error information.
- [x] Status reads enforce tenant ownership so one school cannot inspect another school's import job.
- [x] Invalid job creation input returns structured errors rather than partially created jobs.
- [x] Brain database/API documentation impact is identified for the new job contract, even if final Brain updates are completed in the documentation ticket.
