# Admission Portal And Document Template System

## Status
Done

## Last Updated
2026-07-01

## Source
User requested a readiness confirmation and full task dump for the admission flow, public website visibility, parent submission, review/approval, payment handoff, admission-letter PDF templates, result templates, JSON document templates, and custom template requests.

## Current Readiness Snapshot

- Existing foundation: `EnrollmentLink`, `EnrollmentApplication`, public `/enroll/[code]`, document uploads, parent password setup, admin list/create/status/review routes, class-specific requirements, website visibility flags, and basic approve/reject.
- Existing website foundation: public school-site runtime, website template registry with tenant-published website configs, and template admission sections fed by website-visible enrollment links.
- Implemented document foundation: `packages/pdf` now has a shared document template registry, code-backed result templates (`k12-scholar`, `k12-heritage`), code-backed admission-letter templates (`admission-classic-v1`, `admission-modern-v1`), a JSON-backed admission-letter template (`admission-json-simple-v1`), dashboard JSON preview rendering, PDF JSON rendering, a tenant result-template preference model, and public/dashboard PDF routes that resolve selected templates.
- Implemented custom-template foundation: schools can upload an existing admission/result/form PDF or image, track request status (`SUBMITTED`, `QUOTED`, `PAID`, `IN_BUILD`, `READY`, `REJECTED`), receive quote payment handoff instructions/link/due date, attach validated built-template JSON, and select ready custom JSON result templates. Ready custom admission-letter templates also appear in the approval/open/download selectors.
- Local verification completed: Prisma client generation succeeded, local migrations were applied/confirmed on the local Postgres container, root/package typechecks passed, school-site build passed, dashboard build passed outside the sandbox after the PDF font resolver fix, PDF/email render smokes passed, seeded admission-letter/public-link/admin-approval smokes passed, real Resend API delivery smoke passed, live Vercel Blob upload/delete smoke passed after provisioning `school-clerk-admissions`, DB-backed parent submission server-action smoke passed with real Blob upload plus persisted application/document/parent rows, and `tests/admission-document-flow.smoke.ts` now covers visible/manual links, class age/document validation, tampered upload rejection, approval payment metadata, custom admission/result JSON templates, admission-letter PDFs, result PDF JSON rendering, published website config seeding, and idempotent smoke cleanup including notification contacts.
- Browser validation completed: `tests/admission-dashboard-browser.smoke.spec.ts` signs into the tenant dashboard, verifies admission link visibility/manual badges, fetches dashboard admission-letter open/download PDF links, validates the published public home and admissions admission sections expose only `showOnWebsite=true` links, validates direct/manual enrollment pages, submits the manual public admission form in-browser, approves the submitted application with payment details from the dashboard, and verifies the document-template settings/custom-template/JSON preview surface. A school-site dev resolver fix now uses the parsed tenant slug for local subdomain hosts such as `smoke.school-clerk-site.localhost`.
- Production follow-ups moved to backlog: branch-specific `schoolify` Preview Blob env, production Blob URL passport-image validation, and a native checkout-provider decision for paid custom-template builds. These are tracked as `ADM-FU-001`, `DOC-FU-001`, and `DOC-FU-002`; v1 custom-template payment uses manual or external-link handoff. Prisma 7 is now the default for `packages/db`; generation outputs to `packages/db/src/generated/client`, runtime access uses `@prisma/adapter-pg`, and Prisma config normalizes PostgreSQL SSL parameters for CLI/build compatibility.

## Task Breakdown

### ADM-001 - Admission Link Visibility And Class-Specific Requirements

- Priority: P0
- Goal: Complete the admission link setup layer before wiring public website rendering.
- Current status: Implemented in the Phase 1 code path on 2026-06-30; local Prisma generation/migration, root typecheck, seeded public resolver smoke validation, end-to-end admission smoke validation, public direct/manual enrollment page browser validation, and authenticated dashboard setup/browser validation pass.
- Scope:
  - Add `showOnWebsite` to admission/enrollment links.
  - Preserve direct/manual sharing for active links even when `showOnWebsite=false`.
  - Generate tenant-correct public school-site URLs for copied links.
  - Allow document requirements to apply globally or to a specific classroom/class option.
  - Allow each selected classroom/class option to define age requirements, age cutoff date, and requirement notes.
  - Keep existing `ACTIVE` / `PAUSED` / `ARCHIVED` behavior.
- Done when:
  - Admin can create a link, choose display on website or manual-only, and copy the correct public URL.
  - Parent sees only global requirements plus age/document requirements for the selected class.
  - Public submission and admin approval validate the same class-specific age and document requirements server-side.

### ADM-002 - Public Website Admission Section Integration

- Priority: P0
- Goal: Surface public admission links on school websites only when enabled.
- Current status: Implemented in the Phase 2 code path on 2026-06-30; local Prisma generation/migration, root typecheck, school-site build, seeded public resolver smoke validation, direct/manual enrollment route browser validation, and published home/admissions admission-section browser validation pass.
- Scope:
  - Add admission-link data into the school-site public data resolver.
  - Add reusable admission CTA/list section to website templates.
  - Render active, in-window, `showOnWebsite=true` links on the landing/admissions page.
  - Keep `showOnWebsite=false` links hidden from website sections but valid through direct URL.
- Done when:
  - Published school website shows admission CTA when enabled.
  - Hidden/manual-only links do not appear on the public website.
  - Expired, paused, archived, or full links do not render as open admissions.

### ADM-003 - Parent Submission Hardening And Submission-Success Email

- Priority: P0
- Goal: Make parent submission production-ready.
- Current status: Implemented in the Phase 3 code path on 2026-06-30; local Prisma generation/migration, root/package typechecks, email-template render smoke validation, real Resend API delivery smoke validation, live Vercel Blob upload/delete smoke validation, DB-backed parent submission server-action smoke validation, end-to-end admission smoke validation, and browser form submission validation passed.
- Scope:
  - Add structured passport-photo handling or requirement type mapping.
  - Expand applicant/guardian validation where needed.
  - Confirm document storage access policy for sensitive admission files.
  - Send submission-success email using `packages/email` and the existing Resend pattern.
- Done when:
  - Parent receives a submission email after a successful application.
  - Admin can identify passport/photo documents separately from generic uploads.
  - Missing or invalid class-specific files are blocked before application creation.

### ADM-004 - Admission Review Payment Setup And Approval Email

- Priority: P0
- Goal: Turn review into an admission decision and payment handoff workflow.
- Current status: Implemented in the Phase 4 code path on 2026-06-30; local Prisma generation/migration, root/package typechecks, seeded approval transaction smoke validation, real Resend API delivery smoke validation, end-to-end approval/payment smoke validation, and authenticated dashboard approval/payment browser validation passed.
- Scope:
  - Replace bare approve with a review/approval workspace payment handoff form.
  - Let admin choose admission payment amount, label, currency, due date, instructions, and optional external payment URL before approval.
  - Create/link student, guardian, session form, term form, and finance charges in one transaction.
  - Send successful-admission email with payment link/details.
- Done when:
  - Approval cannot complete without required payment setup if the school requires payment.
  - Parent receives an approval email with clear payment instructions/link.
  - Student and finance records are created consistently and idempotently.

### ADM-005 - Admission Letter PDF Generation And Template Selection

- Priority: P1
- Goal: Generate admission letters after approval.
- Current status: Implemented in the Phase 5 code path on 2026-06-30; local Prisma generation/migration, root/package typechecks, PDF render smoke validation, admission-letter route smoke validation, school-site build, public admission-letter PDF route validation against a retained smoke tenant, and authenticated dashboard open/download PDF browser validation passed. Remote passport image validation against a production Blob URL remains a follow-up; local smoke validates passport rendering with a data URL.
- Scope:
  - Define admission-letter payload.
  - Add PDF template registry entries for admission letters.
  - Render student passport, school details, student details, class/session, payment details, and approval metadata.
  - Link generated PDF from the approval email through the public school-site PDF route.
  - Let staff select an admission-letter template during approval and when opening/downloading approved letters.
- Done when:
  - Admin can choose the admission-letter template.
  - Approved parent receives an admission letter PDF/link.
  - The PDF includes student passport and admission-specific details.

### DOC-001 - Shared School Document Template Registry

- Priority: P1
- Goal: Generalize the GND-style template pattern for school documents.
- Current status: Implemented in the document-template code path on 2026-06-30; local Prisma generation/migration, root/package typechecks, PDF render smoke validation, end-to-end admission/result document smoke validation, and authenticated dashboard admission-letter PDF browser validation passed.
- Scope:
  - Add typed registry for document templates with `templateId`, `templateVersion`, label, type, payload schema, preview metadata, and renderer.
  - Support admission letters, admission forms, result sheets, and future documents.
  - Keep templates isolated from database reads; templates receive typed payloads only.
- Done when:
  - Admission and result templates can share one registry approach.
  - Preview and PDF generation use the same template ID.
  - Tenant defaults can point at stable document template IDs.

### DOC-002 - Tenant-Managed Result Template Selection

- Priority: P1
- Goal: Make result templates selectable instead of hardcoded.
- Current status: Implemented in the dashboard settings and result PDF code path on 2026-06-30; local Prisma generation/migration, typechecks, JSON/custom result PDF smoke rendering, and authenticated dashboard settings browser validation passed.
- Scope:
  - Persist a school default result template.
  - Add dashboard selection UI.
  - Update `apps/dashboard/src/app/api/pdf/result/route.ts` to use tenant preference by default.
  - Keep query-param override only where allowed.
- Done when:
  - Schools can select `k12-scholar` or `k12-heritage`.
  - Result PDFs use the tenant default without editing `apps/dashboard/src/configs.ts`.

### DOC-003 - JSON Document Template Renderer

- Priority: P2
- Goal: Add a faster configurable path for simpler school documents.
- Current status: Implemented with constrained JSON schema, dashboard preview, PDF renderer, and a built-in JSON admission letter on 2026-06-30; `@school-clerk/pdf` typecheck, PDF render smoke validation, custom admission/result JSON smoke rendering, and dashboard JSON preview browser validation passed.
- Scope:
  - Define a constrained JSON layout DSL for pages, text, images, tables, signatures, QR/payment fields, conditions, bindings, and styles.
  - Validate JSON templates with Zod.
  - Render JSON templates to dashboard preview and PDF.
  - Use JSON for simple admission letters/forms first; keep complex result PDFs code-backed until proven stable.
- Done when:
  - A validated JSON template can render a simple admission letter preview and PDF.
  - Invalid bindings/styles are rejected before publishing.

### DOC-004 - Custom Admission And Result Template Request Workflow

- Priority: P2
- Goal: Let schools request paid custom template builds from existing PDFs/scans.
- Current status: Implemented in the dashboard settings, DB model, result template preference, admission approval selector, and PDF route integration; local Prisma generation/migration passed for the 2026-06-30 migrations and the 2026-07-01 quote-payment migration, dashboard build passes, live Blob upload/delete smoke validation passes, end-to-end custom admission/result JSON template smoke validation passes, and Blob upload failures now surface operator-readable configuration errors. School users can submit/view requests and see quote payment handoff details, while quote/build/ready mutations require an env-configured platform template operator role.
- Scope:
  - Add request form for admission letters/forms and result sheets.
  - Allow PDF/image upload and notes.
  - Track request status: submitted, quoted, paid, in build, ready, rejected.
  - Store quote amount, currency, payment instructions, optional external payment link, and due date.
  - Add operator/admin build handoff.
  - Let school select the finished template when ready.
- Current limitation: quote payment is an external/manual handoff; no native checkout-provider collection is wired yet.
- Done when:
  - School can upload an existing document and request a custom build.
  - Operator can mark a built template ready.
  - Ready custom template appears in the school template selector.

## Phase 1 Implementation Plan - ADM-001

## Senior Dev Walkthrough

1. Start with the existing enrollment-link data model in `packages/db/src/schema/enrollment.prisma`.
   - Keep the existing `EnrollmentLink` / `EnrollmentLinkDocumentRequirement` shape.
   - Add visibility and requirement-targeting fields; do not introduce a parallel `AdmissionLink` model yet.
   - Use `EnrollmentLink` as the admission campaign for now, even if UI copy says "Admission".

2. Update the admin API boundary in `apps/api/src/trpc/schemas/enrollment-links.ts`.
   - Add `showOnWebsite` to create/update input.
   - Add optional `classRoomDepartmentId` to document requirement input.
   - Keep validation in the schema for shape and in the query layer for tenant/session ownership.

3. Update `apps/api/src/db/queries/enrollment-links.ts`.
   - Persist and return `showOnWebsite`.
   - Persist and return requirement classroom targeting.
   - Validate that any requirement-level `classRoomDepartmentId` is one of the classrooms selected for the link.
   - In approval/submission validation, require only global requirements plus requirements matching the selected classroom.

4. Update the dashboard setup UI in `apps/dashboard/src/components/enrollment/enrollment-management-client.tsx`.
   - Keep the existing page and client component.
   - Add a simple toggle/checkbox for "Show on website".
   - Replace the newline-only requirement input with a minimal requirement editor that can choose "All classes" or a selected class.
   - Keep manual copy available regardless of the website visibility setting.

5. Fix public URL generation.
   - Reuse existing tenant/domain helpers where available before adding a new helper.
   - The copied URL should point to the public school-site host, not the dashboard origin.
   - In development, preserve the current working local behavior if the school-site host helper is not available.

6. Update the public form in `apps/school-site/src/app/enroll/[code]/page.tsx`.
   - Server-load requirements with their optional class target.
   - If class-specific requirements need dynamic display, extract the form into a small client component colocated with the route.
   - Show only global requirements plus the requirements for the selected class.
   - Keep server-side enforcement in `apps/school-site/src/lib/enrollment/actions.ts`; client display is convenience, not trust.

7. Add focused tests around behavior, not styling.
   - Cover requirement filtering for selected classroom.
   - Cover invalid requirement target during link creation.
   - Cover public submission missing a class-specific required document.
   - Cover manual-only link remains valid through direct URL.

## Files To Touch

Reuse:
- `packages/db/src/schema/enrollment.prisma`: existing enrollment/admission persistence model.
- `apps/api/src/trpc/schemas/enrollment-links.ts`: existing admin input validation.
- `apps/api/src/db/queries/enrollment-links.ts`: existing link create/update/list/review logic.
- `apps/dashboard/src/components/enrollment/enrollment-management-client.tsx`: existing admin management surface.
- `apps/school-site/src/app/enroll/[code]/page.tsx`: existing public parent form.
- `apps/school-site/src/lib/enrollment/actions.ts`: existing public submit action and upload validation.
- `packages/utils/src/runtime-url.ts` or current tenant URL helpers if present: public URL construction pattern.

Extend / Update:
- `packages/db/src/schema/enrollment.prisma`: add `showOnWebsite` and optional requirement classroom targeting.
- `packages/db/src/schema/classroom.prisma`: add the opposite relation for class-specific document requirements if Prisma requires it.
- `packages/db/src/schema/migrations/*`: add a migration for new fields/indexes.
- `apps/api/src/trpc/schemas/enrollment-links.ts`: add and validate new input fields.
- `apps/api/src/db/queries/enrollment-links.ts`: persist, return, and enforce visibility/requirement targeting.
- `apps/dashboard/src/components/enrollment/enrollment-management-client.tsx`: add visibility toggle, class-aware requirement editor, and public URL copy behavior.
- `apps/school-site/src/app/enroll/[code]/page.tsx`: pass class-aware requirement data into the form.
- `apps/school-site/src/lib/enrollment/actions.ts`: validate class-specific required documents on submit.
- `brain/features/enrollment-links-and-parent-portal.md`: update after implementation to reflect completed behavior.
- `brain/database/schema.md`, `brain/database/relationships.md`, `brain/database/migrations.md`: update after schema/migration changes.
- `brain/api/contracts.md`, `brain/api/endpoints.md`, `brain/api/permissions.md`: update after API contract changes.

Create:
- `apps/school-site/src/app/enroll/[code]/enrollment-form-client.tsx`: only if dynamic class-specific document display cannot stay ergonomic in the current server component.
- `apps/api/src/db/queries/enrollment-links.test.ts` or nearest matching test file: focused tests for requirement targeting and visibility behavior if the repo test setup supports it.

Avoid:
- Do not create a separate `AdmissionLink` model in Phase 1.
- Do not build website landing-page rendering in Phase 1; that is ADM-002.
- Do not implement payment setup, approval email, or admission-letter PDFs in Phase 1.
- Do not trust the client-side visible requirements; server submit must re-check requirements for the selected class.

## Code Shape

```prisma
// packages/db/src/schema/enrollment.prisma
model EnrollmentLink {
  // existing fields
  showOnWebsite Boolean @default(false)
}

model EnrollmentLinkDocumentRequirement {
  // existing fields
  classRoomDepartmentId String?
  classRoomDepartment   ClassRoomDepartment? @relation(fields: [classRoomDepartmentId], references: [id], onDelete: SetNull)
}

// packages/db/src/schema/classroom.prisma
model ClassRoomDepartment {
  // existing fields
  enrollmentDocumentRequirements EnrollmentLinkDocumentRequirement[]
}
```

```ts
// apps/api/src/trpc/schemas/enrollment-links.ts
const enrollmentDocumentRequirementInputSchema = z.object({
  id: z.string().optional().nullable(),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  uploadRequired: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  classRoomDepartmentId: z.string().optional().nullable(),
});
```

```ts
// apps/api/src/db/queries/enrollment-links.ts
function getRequiredDocumentsForClass(link: {
  documentRequirements: Array<{
    id: string;
    uploadRequired: boolean;
    classRoomDepartmentId?: string | null;
  }>;
}, classRoomDepartmentId: string) {
  return link.documentRequirements.filter((requirement) => {
    return (
      !requirement.classRoomDepartmentId ||
      requirement.classRoomDepartmentId === classRoomDepartmentId
    );
  });
}
```

```tsx
// apps/school-site/src/app/enroll/[code]/enrollment-form-client.tsx
export function EnrollmentFormClient(props: {
  code: string;
  classrooms: Array<{ id: string; classRoomDepartmentId: string; name: string }>;
  requirements: Array<{
    id: string;
    label: string;
    description?: string | null;
    uploadRequired: boolean;
    classRoomDepartmentId?: string | null;
  }>;
}) {
  // track selected classroom
  // render global requirements plus selected-class requirements
  // submit through submitEnrollmentApplication.bind(null, code)
}
```

## Execution Checklist

- [ ] Confirm current local Prisma schema generation state before editing.
- [ ] Add `showOnWebsite` and requirement targeting fields to `packages/db/src/schema/enrollment.prisma`.
- [ ] Add migration SQL with safe defaults and indexes for public website filtering.
- [ ] Update admin input schemas for visibility and requirement targeting.
- [ ] Update `createOrUpdateEnrollmentLink` to validate requirement targets against selected classrooms.
- [ ] Update `listEnrollmentLinks` and `getEnrollmentApplications` return shape as needed for dashboard display.
- [ ] Update required-document checks in both admin approval and public submit paths.
- [ ] Add dashboard "Show on website" control and class-aware document requirement editor.
- [ ] Fix copy-link URL to use the public school-site host.
- [ ] Update public enrollment page to display class-specific requirements correctly.
- [ ] Add focused tests or documented manual verification if test coverage cannot be added cleanly.
- [ ] Update required Brain API/database/feature docs after implementation.

## Validation

- `bun run db:generate`
- `bun run typecheck`
- Focused test command if a matching test file is added, for example `bun test apps/api/src/db/queries/enrollment-links.test.ts`
- Manual check with `bun run dev:school-site` and `bun run dev:dashboard`:
  - Create active manual-only link and confirm copied direct URL works.
  - Confirm manual-only link does not appear on website once ADM-002 exists.
  - Create website-visible link and confirm `showOnWebsite` is stored and listed.
  - Submit with missing class-specific required document and confirm server rejects it.
  - Submit with all required documents and confirm application is created.

## Open Questions

- Should class-specific requirements be editable as a table in Phase 1, or is a compact dropdown-per-requirement editor enough for the first pass?
- Should `showOnWebsite` be allowed only for `ACTIVE` links, or can admins preconfigure it while the link is still `PAUSED`?

## Later Phase Notes

- ADM-002 now uses `showOnWebsite` and current link status/window/capacity to drive public website rendering.
- ADM-004 stores both structured payment instructions and an optional external payment URL; later online payment work can replace the external URL with a first-party payment session while keeping the same approval email contract.
- DOC-003 should be constrained JSON, not arbitrary HTML/JS, because templates will render sensitive student documents.
- GND reference direction: prefer typed payloads plus registry-selected HTML/PDF renderers for high-fidelity documents; use JSON templates for simpler, configurable documents.
