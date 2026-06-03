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

## Non-Negotiable Architecture Rules
- Midday is the primary standard for pages, tables, modals, sheets, sidebar, forms, onboarding, layouts, tRPC calls, loading states, error states, and caching patterns.
- Pages, tables, modals, sheets, forms, onboarding, sidebar, sign-out, and shared dashboard components must follow Midday architecture, file naming, and coding patterns unless a documented SchoolClerk domain constraint requires a divergence.
- Tables must follow the Midday folder pattern: `components/tables/core`, `components/tables/<domain>/columns.tsx`, `components/tables/<domain>/data-table.tsx`, `components/tables/<domain>/table-header.tsx`, `components/tables/<domain>/skeleton.tsx`, `components/tables/<domain>/empty-states.tsx`, plus `bottom-bar.tsx` and `action-menu.tsx` when needed.
- Sheets must follow the Midday global sheet pattern: `components/sheets/global-sheets.tsx`, `components/sheets/global-sheets-provider.tsx`, and domain-specific files under `components/sheets/...`.
- Forms must follow Midday validation, error handling, and mutation patterns.
- Data fetching and mutations must use standard Midday tRPC patterns, including invalidation, loading states, error states, and caching behavior.
- Use shadcn standard components and patterns. Never directly modify shadcn source components; create wrapper components for project-specific behavior.
- Use GND as the reference for the standard notification package system.
- Use Plot Keys as the reference for local URL handling, portless/proxy support, and generated links.
- Add `app/[...slug]/page.tsx` as a catch-all route that redirects to `/` unless this repository has an explicit documented reason to diverge.
