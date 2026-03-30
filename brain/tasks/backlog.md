# Backlog

## Purpose
Prioritized list of tasks not yet started.

## How To Use
- Add new tasks here first.
- Keep tasks small and actionable.
- Move tasks to in-progress when work starts.

## Template
## Task Item
- ID:
- Title:
- Type: feature | bug | chore | docs
- Priority: P0 | P1 | P2 | P3
- Scope:
- Dependencies:
- Owner:

## Task Item
- ID: CORE-001
- Title: Design and implement institution type configuration
- Type: feature
- Priority: P0
- Scope: Add canonical `institutionType` enum, tenant config storage, read/write API, and validation rules.
- Dependencies: ADR-0002
- Owner: TBD

## Task Item
- ID: CORE-002
- Title: Implement module enable/disable engine per tenant
- Type: feature
- Priority: P0
- Scope: Add module flags, UI gating, API/service authorization checks, and onboarding defaults by institution type.
- Dependencies: CORE-001
- Owner: TBD

## Task Item
- ID: CORE-003
- Title: Normalize academic hierarchy model
- Type: feature
- Priority: P0
- Scope: Unify session/term/level/department/program model and align enrollment, attendance, and assessment references.
- Dependencies: CORE-001
- Owner: TBD

## Task Item
- ID: EXAM-001
- Title: Design external examination data model and module config
- Type: feature
- Priority: P1
- Scope: Define schema/entities for exam bodies, exams, candidates, subjects, centers, payments, documents, and results; add tenant module toggle support.
- Dependencies: CORE-001, CORE-002
- Owner: TBD

## Task Item
- ID: EXAM-002
- Title: Implement candidate registration workflow (single + bulk)
- Type: feature
- Priority: P1
- Scope: Build registration flow, subject selection, payment tracking, status transitions, deadline validation, and export/slip generation.
- Dependencies: EXAM-001
- Owner: TBD

## Task Item
- ID: EXAM-003
- Title: Implement external result tracking and analytics
- Type: feature
- Priority: P2
- Scope: Add result capture/import, candidate result history, pass-rate analytics, and score distribution dashboards.
- Dependencies: EXAM-002
- Owner: TBD
