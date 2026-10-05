# Legacy student migration

## Status

2026-09-08: ownership-required containment implemented; migration functionality and all verification pending. See [ADR-0050](../decisions/ADR-0050-unowned-legacy-migration-containment.md).

## Scope and current behavior

The `/migration` tool targets historical 1445/1446 records plus the unbound global Posts datasets `student-migrate-data`, `student-genders` and `student-merge-data`. It is distinct from the 1446/1447 FTD tool. No owner mapping is established by the existing schema or source. The user has been asked to identify the owning school or authorize retirement.

Live school Admin with Students, Academics and Finance may see the ownership-required notice, not dataset contents. Legacy reads/writes/import/assignment/dump and cookie/name/gender actions reject before work, including direct calls. No environment toggle can activate them. The page imports no historical data or auto-import client and provides a responsive directory link. Existing data and cookies are preserved. Current registration and reviewed import remain separate supported workflows; this containment does not certify their verification.

## Implementation files

- `apps/dashboard/src/lib/legacy-migration-access.ts`: server-only authorization/status and always-denying ownership gate.
- `apps/dashboard/src/app/[domain]/migration/page.tsx`: thin authenticated notice composition.
- `apps/dashboard/src/components/migration/legacy-migration-notice.tsx`: constrained, wrapping notice with 44px directory action.
- `apps/dashboard/src/app/[domain]/migration/server.ts` and `cookie.ts`: direct legacy read/write guards.
- `apps/dashboard/src/actions/import-student-action.ts`, `create-student.ts`, `create-student-academic-profile.ts`: migration-only action/helper guards.

## Remaining checklist

- [ ] Receive an explicit dataset owner or retirement decision.
- [ ] If retained, design and implement school-owned dataset storage, cache isolation, bounded inputs and live-authorized atomic migration/finance conversion; do not merely remove the gate.
- [ ] Rebuild the owned review/import UI and statuses against the Midday planner contract.
- [ ] Verify direct-call denial, absence of pre-guard effects, supported-workflow isolation and mobile/browser/keyboard behavior in the user-resumed testing phase.

The unused global student-link repair helper was removed from API source, not executed. No schema/data operation or test ran. This feature is not complete.
