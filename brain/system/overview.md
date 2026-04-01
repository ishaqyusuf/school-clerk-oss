# System Overview

## Purpose
Operational summary of SchoolClerk domains, modules, and runtime boundaries.

## How To Use
- Update when capabilities or platform boundaries change.
- Keep concise, link out for detail.
- Reflect actual implementation state.

## Template
## Domain Summary
- Multi-tenant education operations SaaS
- Tenants represent schools or institutions

## Key Capabilities
- Admissions, academics, attendance, finance, communication
- Finance includes term-scoped accounting streams, classroom-scoped billables, and a receive-payment workflow that searches all students but allocates against the active term sheet.

## Runtime Boundaries
- Frontend apps: `apps/dashboard` (authenticated product UI), `apps/web` (marketing)
- Backend services: `apps/api` tRPC/Hono API, Trigger.dev jobs in `packages/jobs`
- Data stores: PostgreSQL via Prisma models in `packages/db/src/schema/*.prisma`
- External providers: Better Auth, Vercel domains, Resend email, Google Fonts (build-time fetch in Next.js)
