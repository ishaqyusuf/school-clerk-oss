# AI Prompt Rules

## Purpose
Prompting guidelines to keep AI outputs consistent, safe, and architecture-aligned.

## How To Use
- Use these rules when writing prompts for implementation or review tasks.
- Update when standards evolve.
- Keep rules concrete and testable.

## Template
## Required Prompt Context
- Objective and scope
- Relevant file paths
- Constraints (performance, security, tenancy)
- Expected output format

## Guardrails
- Reuse existing utilities before adding new abstractions.
- Do not break tenant isolation boundaries.
- Keep API and DB changes synchronized in docs.
- Prefer small, reviewable diffs.
- Document non-trivial decisions and tradeoffs.
- For product-app links and client navigation, use canonical app-relative routes like `/finance/...` or `/students/...`; avoid prefixing paths with `/dashboard/...` unless the task explicitly requires infrastructure-level routing work.
