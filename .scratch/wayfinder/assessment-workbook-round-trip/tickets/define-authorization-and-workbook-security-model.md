# Define Authorization And Workbook Security Model

Labels: `wayfinder:research`
Status: Resolved
Blocked by: None
Blocks: [Specify Signed Workbook Contract](specify-signed-workbook-contract.md), [Design Import Verification And Conflict Algorithm](design-import-verification-and-conflict-algorithm.md), [Choose Import Execution Audit And Idempotency Model](choose-import-execution-audit-and-idempotency-model.md)

## Question

What trust boundary, authorization checks, signing scheme, replay policy, and hostile-file defenses make generated Assessment Workbooks safe to download and upload?

## Context

Generated workbooks carry stable tenant, term, classroom, student, subject, and assessment identity. Admins have tenant-wide academic access, teachers are assignment-scoped, and upload must revalidate current permissions. Hidden metadata must detect tampering without becoming an authorization bypass.

## Resolve

- Define tenant, term, classroom, subject, student, and assessment authorization checks at generation, verification, resolution, and apply time.
- Decide what metadata is signed, the signature algorithm/key source, key rotation behavior, and whether a persisted export record is required.
- Decide replay and duplicate-upload behavior.
- Define workbook size, sheet, row, column, string, relationship, archive, and decompression limits.
- Define rejection behavior for macros, external links, formulas, embedded objects, unknown sheets, altered identifiers, and unsupported versions.
- Define error disclosure so failures are actionable without leaking cross-tenant identity.
- Define audit events for download, rejected upload, reviewed upload, assessment creation, conflict override, and applied import.

## Expected Answer

A concrete security and permission model with verification order, signed claims, limits, replay behavior, current-access checks, audit requirements, and threat scenarios.

## Comments

Treat every upload as untrusted regardless of its hidden metadata. Sign immutable workbook identity and snapshot claims server-side, then revalidate tenant, term, classroom, subject, assessment, student, and current user access during verification and again immediately before applying. Add strict ZIP/XLSX resource limits and reject macros, formulas, external relationships, unknown versions, altered structure, and unsupported sheets before reading score data.

## Resolution

Implemented persisted export identity, HMAC-SHA256 signed metadata, tenant/term/classroom binding, current classroom and subject authorization at every phase, and serializable apply revalidation. Preflight rejects oversized/expanded archives, macros, embedded objects, external links, unknown sheets, exposed metadata, altered protection/mappings, and formulas.
