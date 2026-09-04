# Standardize Email Delivery On Clerk Ledger

Migrate every active School Clerk email message to the approved Clerk Ledger visual system while preserving tenant delivery rules and keeping all reusable rendering inside `packages/email`.

## Reference Compared

School Clerk target:

- `packages/email/components/*`
- `packages/email/emails/*`
- `packages/auth/src/index.ts`
- `apps/dashboard/src/actions/create-saas-profile.ts`
- `apps/school-site/src/lib/enrollment/actions.ts`
- `apps/api/src/db/queries/enrollment-links.ts`
- `apps/api/src/lib/notifications.ts`
- `packages/notifications/src/types/*`
- `packages/jobs/src/tasks/send-staff-invitation-email.ts`

Midday reference:

- `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email/components/*`
- `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email/emails/invite.tsx`
- `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email/emails/welcome.tsx`
- `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email/emails/invoice-paid.tsx`
- `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email/emails/payment-issue.tsx`
- `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/email/emails/api-key-created.tsx`

Approved visual reference:

- `~/.gstack/projects/ishaqyusuf-school-clerk-oss/designs/email-clerk-ledger-20260830/finalized.html`

## Migration Principle

Follow Midday's package boundary and template composition: applications and jobs own delivery orchestration, while `packages/email` owns rendering and reusable primitives. Adapt the approved Clerk Ledger palette, institutional header, record rows, notice block, actions, fallback URL, and tenant footer to React Email-safe markup.

## Files To Touch

Reuse:

- `packages/email/components/theme.tsx`: keep the shared provider and inline fallback strategy.
- `packages/email/components/logo.tsx`: retain the required shared brand component but make it tenant-led and image-independent.
- `packages/email/components/footer.tsx`: retain one shared footer with tenant-aware copy.
- `packages/email/components/button.tsx`: retain one shared action primitive.
- `packages/utils/src/email.ts`: keep delivery-safe tenant subject/from formatting.

Extend / update:

- `packages/email/emails/admission-approval.tsx`
- `packages/email/emails/admission-submission.tsx`
- `packages/email/emails/finance-notification.tsx`
- `packages/email/emails/staff-invitation.tsx`
- `packages/email/index.ts`
- `packages/email/package.json`
- `packages/auth/src/index.ts`
- `packages/auth/package.json`
- `apps/dashboard/src/actions/create-saas-profile.ts`
- `packages/notifications/src/types/*`
- `packages/notifications/package.json`

Create:

- `packages/email/components/email-frame.tsx`: Clerk Ledger frame and tenant header.
- `packages/email/components/ledger.tsx`: reusable record rows.
- `packages/email/components/notice.tsx`: contextual next-step/status callout.
- `packages/email/components/fallback-link.tsx`: accessible raw URL fallback.
- `packages/email/emails/password-reset.tsx`: Better Auth password setup/reset email.
- `packages/email/emails/signup-verification.tsx`: owner verification email.
- `packages/email/emails/workspace-ready.tsx`: onboarding/workspace-ready email.
- `packages/email/emails/rendering.test.tsx`: render coverage for all seven layouts.

Avoid:

- Do not add another email package or app-owned design primitives.
- Do not change delivery routing, QA recipient behavior, or Resend credentials.
- Do not introduce a database migration.
- Do not retain raw HTML templates in auth or signup actions.

## Code Shape

```tsx
// packages/email/components/email-frame.tsx
export function EmailFrame(props: EmailFrameProps) {
  // EmailThemeProvider -> Body -> 600px Clerk Ledger container
  // tenant Logo/header -> eyebrow/title/intro -> template content -> Footer
}

// app or package caller
const html = await render(TemplateEmail(props));
await deliver({ html, subject: formatTenantEmailSubject(...) });
```

## Execution Checklist

- [x] Implement shared Clerk Ledger tokens and layout primitives.
- [x] Refactor the four existing templates to the shared frame.
- [x] Add password reset, signup verification, and workspace-ready templates.
- [x] Add default exports and preview-safe sample defaults for all layouts.
- [x] Replace raw HTML rendering in auth and signup orchestration.
- [x] Normalize tenant notification subjects through `formatTenantEmailSubject`.
- [x] Add render tests covering every layout and high-risk conditional branch.
- [x] Run package typechecks, focused tests, lint/format checks, and affected-workspace checks.
- [x] Restart React Email, verify discovery, and capture desktop/mobile screenshots.
- [x] Update Brain feature/task documentation and run the final Midday conformance audit.

## Route, State, Table, And Sheet Omission

This migration has no page route, URL state, table, form, modal, sheet, API schema, or database-query behavior. Those Midday migration sections are intentionally omitted because the feature is a server-rendered email package plus thin delivery callers.

## Validation

- `bun --cwd packages/email test`
- `bun run --cwd packages/email typecheck`
- `bun run --cwd packages/email lint`
- `bun run --cwd packages/notifications typecheck`
- `bun run --cwd packages/auth typecheck`
- `bun run --cwd apps/school-site typecheck`
- `bun run --cwd apps/api typecheck`
- `bun run --cwd apps/dashboard typecheck`
- `bun run typecheck`
- React Email preview at the active `school-clerk-email` Portless hostname.
- Browser screenshots at desktop and mobile viewports.

### Validation Results

- `packages/email`: source lint and typecheck pass; 9 tests pass with 52 assertions, including explicit CTA padding and invalid shared-footer URL regression coverage.
- `packages/notifications`: all touched files pass Biome; typecheck passes; 3 subject-contract tests pass.
- `packages/auth`: touched files pass Biome; package typecheck passes.
- `apps/school-site`: package typecheck passes.
- `apps/dashboard`: typecheck reaches established unrelated `ErrorComponent` incompatibilities across existing pages plus undeclared Radix imports in untouched `menu.tsx` and `types.ts`; the touched signup action passes direct Biome and its shared dependencies typecheck.
- `apps/api`: typecheck reaches only the two established academic-term reset/setup errors.
- `packages/jobs` and root `bun run typecheck`: remain blocked by existing database export/module-resolution and shared strictness errors; the root run completed 13 package checks before Jobs stopped Turbo.
- React Email discovers all seven layouts at `https://school-clerk-email.localhost`; every preview has one render frame, Clerk Ledger footer copy, and no `undefined` values.
- The original 15-message catalog was verified at 390 × 844 and 1440 × 1000 with no document-width overflow; thirty historical screenshots and their HTML files remain under `~/.gstack/projects/ishaqyusuf-school-clerk-oss/designs/email-clerk-ledger-implementation-20260830`. After the review fixes, a fresh 15-message HTML catalog confirms inline CTA padding, removal of unsafe footer destinations, and no undefined values. Fresh screenshots are pending because local-file browser navigation is blocked in the current automation environment.
- React Email CLI and UI are aligned at `6.9.3`, removing the earlier `framer-motion`/`motion-dom` build incompatibility. The generated preview app now reaches Next.js 16.3 production compilation; validation in this environment stops only because the generated UI fetches Inter from Google Fonts and the build runner cannot reach `fonts.googleapis.com`. This does not affect application-side `@react-email/render`, the passing layout tests, or the live development preview.

## Open Questions

None. Direction 01 is approved, the package boundary is established, and delivery behavior remains unchanged.

## Final Conformance Audit

- [x] App and job callers only orchestrate recipient routing, subject creation, rendering, and provider delivery.
- [x] All reusable UI and template behavior lives in `packages/email`.
- [x] Every active message type maps to one of the seven standardized layouts.
- [x] All seven layouts render without undefined content and are discoverable by React Email.
- [x] All 15 active mobile variants were visually verified at 390px before the final CTA/footer corrections; the corrections are covered by rendered-HTML assertions, while refreshed screenshot evidence remains pending due to the current browser policy.
- [x] No page route, URL-state, table, form, modal, sheet, API-schema, or database behavior was introduced; those Midday migration domains remain intentionally omitted.
- [x] Brain feature, plan, and task state reflect the final architecture and validation record.
