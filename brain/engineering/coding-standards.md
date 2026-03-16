# Coding Standards

## Purpose
Defines implementation standards for consistency, maintainability, and reliability.

## How To Use
- Apply in every PR and refactor.
- Update when conventions evolve.
- Keep rules specific and enforceable.

## Template
## General Standards
- Prefer clear names and small functions.
- Avoid duplicated logic.
- Keep modules cohesive.
- Add tests for non-trivial business logic.

## Reliability Standards
- Validate all external inputs.
- Handle errors explicitly.
- Add logging at critical boundaries.

## Multi-Tenancy Standards
- Enforce tenant context on every data access.
- Avoid cross-tenant joins unless explicitly safe.
- Include tenant-aware tests.
