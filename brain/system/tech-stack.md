# Tech Stack

## Purpose
Source of truth for frameworks, runtimes, libraries, and infrastructure choices.

## How To Use
- Update on dependency or platform changes.
- Include version targets and rationale.
- Keep production-impacting choices explicit.

## Current Stack
## Application Stack
- Web frontend: Next.js (App Router)
- API layer: tRPC
- Database: PostgreSQL
- ORM: Prisma
- Mobile app: Expo React Native
- Email: Resend
- Background jobs: Trigger.dev

## Infrastructure
- Hosting: Vercel
- CI/CD: TODO:
- Storage: PostgreSQL primary store
- Monitoring: TODO:

## Security
- Authentication: Supabase Auth
- Authorization: Role-based + tenant-scoped authorization in services/API (TODO: finalize matrix in `brain/api/permissions.md`)
- Secrets management: TODO:
