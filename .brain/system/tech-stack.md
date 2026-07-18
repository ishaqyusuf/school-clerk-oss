# Tech Stack

## Purpose
Source of truth for frameworks, runtimes, libraries, and infrastructure choices.

## How To Use
- Update on dependency or platform changes.
- Include version targets and rationale.
- Keep production-impacting choices explicit.

## Current Stack
## Application Stack
- Dashboard frontend: Next.js 16.2.10 (App Router) + React 19
- Marketing/public frontend: Next.js 16.2.10
- Styling/UI: Tailwind CSS 4 + shared shadcn/ui-based components in `@school-clerk/ui`
- API layer: Hono + tRPC
- Database: PostgreSQL
- ORM: Prisma
- Authentication: Better Auth with Prisma adapter
- Package manager: Bun workspaces
- Monorepo build orchestration: Turborepo
- Email: Resend + `packages/email`
- Background jobs: Trigger.dev via `packages/jobs`
- Public fonts/assets: Google Fonts at build time in Next.js
- Mobile app: Expo React Native

## Infrastructure
- Hosting: Vercel
- CI/CD: TODO:
- Storage: PostgreSQL primary store
- Monitoring: TODO:
- Local named-host dev: Portless-capable workspace scripts use the shared HTTPS proxy on standard port `443`. Agents do not launch dev directly; when dev is required and not already running, they create a new tab in the already-open cmux session and run `jd school-clerk dev --local -f marketing dashboard school-site`. Website QA uses `https://school-clerk.localhost`, `https://<tenant>.school-clerk-dashboard.localhost`, and `https://<tenant>.school-clerk-site.localhost` without visible port numbers. An explicit port on a named host is a blocking Portless defect.

## Security
- Authentication: Better Auth
- Authorization: Role-based + tenant-scoped authorization in services/API (TODO: finalize matrix in `brain/api/permissions.md`)
- Secrets management: TODO:
