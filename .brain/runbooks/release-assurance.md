# Release assurance runbook

## Before activation

1. Create protected GitHub `preview` and `production` environments with
   separate evidence-envelope and HMAC secrets.
2. Require `release-assurance-preview` on pull requests to `main` and
   `release-assurance-production` before a Production promotion is accepted.
3. Set the four School Clerk Vercel project-ID variables and the Trigger
   project reference in both protected environments. Do not invent a project
   mapping: unprovisioned Marketing, school-site, or API targets stay blocked.
4. Install a trusted collector that queries Neon, Vercel, and Trigger through
   authenticated read APIs and signs one fresh, exact-revision envelope.
5. Prove isolated Preview database configuration. School Clerk policy forbids
   a Preview schema push unless the user explicitly authorizes it, and
   Production must never substitute for Preview.
6. Configure Vercel promotion holds for schema-changing Production releases.
7. Prove Trigger Preview ownership, or obtain a protected, exact-revision,
   short-lived waiver. Never point Preview verification at Production jobs.

## Local operator flow

```bash
bun run release:plan --env preview
bun run release:status --env preview
```

The commands are read-only and explain what the current diff requires. Repeat
with `--env production` for a Production candidate. After authorized operators
perform the listed effects through existing guarded commands, protected CI
runs `release:check` with signed evidence. The verification workflow itself
does not push the database or deploy an app.

## Failure interpretation

- Missing baseline: the planner conservatively requires the target.
- Missing provider mapping: provision or confirm that target before activation.
- Missing, stale, or wrong-revision signature: do not release.
- Database proof missing: dependent web and jobs targets cannot pass.
- Vercel deployment not active for the claimed revision: hold promotion.
- Preview jobs unsupported: provision isolation or use the protected waiver;
  never fall back to Production.

## Current source boundary

The manifest models Database, Dashboard, Marketing, school-site, API, and jobs.
Only `schoolclerk-dashboard` was found in the authenticated Vercel inventory.
The remaining web mappings, isolated Preview database, trusted collector,
GitHub protection, Vercel holds, and Trigger Preview policy are activation work,
not implicit effects of this source integration.
