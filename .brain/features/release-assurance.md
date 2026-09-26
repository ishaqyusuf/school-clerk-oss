# Release Assurance

## Scope

`release.manifest.json` covers the Prisma schema, Dashboard, Marketing,
tenant school-site, API, and Trigger jobs for Preview and Production. Mobile
is absent. `bun run release:plan --env preview|production --json` and
`bun run release:status --env preview|production --json` give advisory local
plans. `bun run release:check --env preview|production` runs the pinned,
verification-only provider gate.

## Provider evidence

The adapter accepts a fresh HMAC-signed envelope bound to `school-clerk`,
environment, and exact Git revision. It must include provider-corroborated
receipts, current target fingerprints, live state, Vercel deployment/domain/
promotion data, and Trigger deployment or protected Preview waiver data.
Protected CI uses environment-scoped `SCHOOL_CLERK_RELEASE_EVIDENCE_ENVELOPE`
and `SCHOOL_CLERK_RELEASE_EVIDENCE_HMAC_KEY`. A protected collector must produce
the envelope from authenticated provider reads; no collector is installed by
this source integration. For local tests only, a file may be supplied through
`SCHOOL_CLERK_RELEASE_EVIDENCE_FILE` inside the checkout.

The CI environment must also set the four `SCHOOL_CLERK_VERCEL_*_PROJECT_ID`
variables and `SCHOOL_CLERK_TRIGGER_PROJECT_REF`. Only the Dashboard project
(`schoolclerk-dashboard`, `prj_oSG2ATBE1Mobp3P989VG6B2mTQ5B`) was confirmed
through authenticated, read-only Vercel inspection during integration. CI
rejects missing mappings. The Trigger Preview target is unsupported until isolated
worker ownership is configured or a protected, expiring waiver is provided.

## Activation blockers

- Confirm Marketing, school-site, and API Vercel projects, exact deployment
  domains, and hosted Preview/Production database wiring. The local profile
  files declare distinct database URL identities, while authenticated Vercel
  inspection found only the Dashboard project in the accessible team.
- Install an authenticated provider evidence collector and protected signing
  key. An HMAC envelope alone cannot establish provider truth if the signer
  relies on handwritten claims.
- Protect GitHub Preview/Production environments, require their release checks,
  and configure Vercel promotion holds for schema-changing Production releases.
- Provision isolated Trigger Preview jobs or approve an exact-revision,
  expiring protected waiver. The repository's existing deploy script targets
  Production only.
