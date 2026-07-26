# ADR-0017: Centralized Classroom Level Ordering

## Status

Accepted - 2026-07-26

## Context

Classroom and classroom-department lists are produced by API routers, query modules, dashboard server actions, cached reads, finance and enrollment response shaping, and AI tools. Each producer previously defined its own ordering. Those definitions drifted between level-first, name-first, department-only, and database insertion order, so the same academic structure appeared in different sequences across the product.

## Decision

- Define the canonical Prisma ordering inputs in `@school-clerk/db`.
- Order class-only lists by class level, then class name and id.
- Order global classroom-department lists by parent class level, department level, class name, department name, and id.
- Order departments nested under one class by department level, department name, and id.
- Put null levels after configured levels.
- Provide an equivalent in-memory comparator for response models that cannot use a direct Prisma relation order.

## Consequences

- Classroom order is consistent across API, dashboard, cached, finance, enrollment, and AI classroom-list surfaces.
- Future ordering changes have one shared database-package contract and one parity-tested in-memory comparator.
- Producers remain responsible for selecting the class and department level fields when in-memory sorting is required.
- Lists whose purpose is validation, access-set construction, or recency sampling do not acquire presentation ordering unless their result is returned as a classroom list.
- Mixed search result APIs retain relevance ordering because they are search results, not classroom-list producers.
