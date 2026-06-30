# AI Rules

## Purpose
Operational rules for AI agents contributing to this repository.

## How To Use
- Review before AI-assisted coding sessions.
- Keep in sync with team standards.
- Prioritize safety and maintainability.

## Template
## Core Rules
- Read relevant `brain/` docs before changes.
- Preserve existing behavior unless change is requested.
- Keep diffs focused and minimal.
- Update docs alongside code changes.
- Prefer the existing `portless`-wrapped `dev` scripts for local app startup; do not introduce new hardcoded default ports unless explicitly required.
- Current Portless local app names: dashboard -> `school-clerk-dashboard`, web -> `school-clerk-web`, school-site -> `school-clerk-site`, api -> `api`.
- School-site local dev runs behind Portless at `school-clerk-site.localhost` with its Next app port set to `2400`.
- The root `dev:websites` / `websites` workflow runs dashboard, `@school-clerk/site`, `@school-clerk/school-site`, and jobs together for website work.
- Dashboard tenant development hosts resolve as `<tenant>.school-clerk-dashboard.localhost`; keep host parsing and cookie lookup aligned with that format.
- Internal dashboard navigation should use proxy-relative product routes such as `/finance`, `/students`, `/academic`, etc. Do not hardcode `/dashboard/...` into hrefs or router pushes, because tenant/domain proxying already handles the dashboard mount.

## Documentation Rules
- Use ADRs for architectural decisions.
- Log resolved bugs in bug memory.
- Move tasks across backlog, in-progress, and done states.
