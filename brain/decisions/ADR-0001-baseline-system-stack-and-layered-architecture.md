# ADR-0001: Baseline System Stack and Layered Architecture

- Status: accepted
- Date: 2026-03-13

## Context
SchoolClerk needs a clear baseline architecture for a multi-tenant SaaS product serving schools with web and mobile experiences. The project requires a stack that supports rapid product iteration, strong typing across boundaries, and maintainable separation of concerns.

## Decision
Adopt the following baseline stack and layered architecture:
- Web frontend: Next.js App Router
- Mobile frontend: Expo React Native
- API layer: tRPC routers
- Business layer: service modules
- Data access layer: Prisma repositories
- Database: PostgreSQL
- Authentication: Supabase Auth
- Email: Resend
- Background jobs: Trigger.dev
- Hosting: Vercel

Adopt this monorepo folder baseline:
- `apps/web`
- `apps/mobile`
- `packages/db`
- `packages/api`
- `packages/ui`

## Consequences
### Positive
- End-to-end type safety between frontend and API through tRPC.
- Clean separation between API, business logic, and data access.
- Fast web deployment workflow with Vercel.
- Shared package model enables code reuse across web and mobile.

### Tradeoffs
- Clear service/repository boundaries must be enforced to prevent logic leakage into routers.
- Tenant isolation details still require explicit implementation strategy.
- Additional platform complexity from maintaining both web and mobile clients.

## Alternatives Considered
- REST API instead of tRPC
- GraphQL API gateway
- Single frontend channel (web only) before mobile
- Non-monorepo repository layout

## Follow-up Actions
- Define tenant isolation implementation (row-level, schema-level, or database-level) in system and database docs.
- Define authorization matrix in `brain/api/permissions.md`.
- Define CI/CD, monitoring, and secrets management details in `brain/system/tech-stack.md`.
