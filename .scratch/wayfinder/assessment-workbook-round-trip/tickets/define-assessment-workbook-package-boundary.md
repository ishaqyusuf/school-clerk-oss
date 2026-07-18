# Define Assessment Workbook Package Boundary

Labels: `wayfinder:research`
Status: Resolved
Blocked by: None
Blocks: [Specify Signed Workbook Contract](specify-signed-workbook-contract.md), [Choose Import Execution Audit And Idempotency Model](choose-import-execution-audit-and-idempotency-model.md)

## Question

Where should the deterministic Assessment Workbook generation, parsing, normalization, verification, and shared contracts live, and which runtime boundaries should own each responsibility?

## Context

The current classroom result export is client-generated CSV inside `classroom-result-table.tsx`. The new feature needs real `.xlsx` generation and parsing, hidden signed metadata, server-authoritative validation, browser-safe UI contracts, and reuse by dashboard/API tests without coupling client code to database modules.

## Resolve

- Inventory existing workbook/spreadsheet dependencies and reusable monorepo packages.
- Compare a new focused package with extending `packages/assessment-results`.
- Define browser-safe types and schemas versus server-only workbook, cryptographic, and persistence adapters.
- Decide whether generation happens in an API route, tRPC procedure, background job, or another existing server boundary.
- Decide how parsing is isolated from untrusted workbook input and resource exhaustion.
- Identify the smallest stable public API for generate, inspect, verify, plan, and apply operations.
- Document dependency direction and test seams.

## Expected Answer

A package/runtime boundary recommendation with proposed module names, public APIs, allowed dependencies, and rationale that downstream workbook-contract and implementation tickets can treat as fixed.

## Comments

Start with a focused `@school-clerk/assessment-workbooks` package. Keep workbook schemas, normalization, import-plan types, and pure verification helpers reusable; expose XLSX parsing, generation, and signing through a server-only entry point. Database queries and authorization should remain in the API layer, while `packages/assessment-results` continues owning assessment scoring rules.

## Resolution

Implemented `@school-clerk/assessment-workbooks` with a browser-safe root export and server-only `./server` entry. API authorization/persistence remain in `apps/api`; dashboard consumes only typed contracts.
