# Admission Portal And Document Template System

## Status
In Progress

## Last Updated
2026-06-30

## Source
User requested a readiness confirmation and full task dump for the admission flow, public website visibility, parent submission, review/approval, payment handoff, admission-letter PDF templates, result templates, JSON document templates, and custom template requests.

## Current Readiness Snapshot

- Existing foundation: `EnrollmentLink`, `EnrollmentApplication`, public `/enroll/[code]`, document uploads, parent password setup, admin list/create/status/review routes, class-specific requirements, website visibility flags, and basic approve/reject.
- Existing website foundation: public school-site runtime, website template registry with tenant-published website configs, and template admission sections fed by website-visible enrollment links.
- Existing document foundation: `packages/pdf` has code-backed result templates (`k12-scholar`, `k12-heritage`) and a result PDF route.
- Missing for the requested full flow: submission-success email, approval email, payment setup during approval, payment link, admission-letter PDF generation, admission/result template selection in dashboard, JSON document template renderer, and custom template upload/request workflow.

## Task Breakdown

### ADM-001 - Admission Link Visibility And Class-Specific Requirements

- Priority: P0
- Goal: Complete the admission link setup layer before wiring public website rendering.
- Current status: Implemented in the Phase 1 code path on 2026-06-30; pending migration/client generation and runtime validation.
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
- Current status: Implemented in the Phase 2 code path on 2026-06-30; pending Prisma client generation, migration rollout, typecheck, and runtime validation.
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
- Scope:
  - Replace bare approve with a review/approval workspace.
  - Let admin choose admission fees/payment plan/payment instructions before approval.
  - Create/link student, guardian, session form, term form, and finance charges in one transaction.
  - Send successful-admission email with payment link/details.
- Done when:
  - Approval cannot complete without required payment setup if the school requires payment.
  - Parent receives an approval email with clear payment instructions/link.
  - Student and finance records are created consistently and idempotently.

### ADM-005 - Admission Letter PDF Generation And Template Selection

- Priority: P1
- Goal: Generate admission letters after approval.
- Scope:
  - Define admission-letter payload.
  - Add PDF template registry entries for admission letters.
  - Render student passport, school details, student details, class/session, payment details, and approval metadata.
  - Attach or link generated PDF from the approval email.
  - Let school select default admission-letter template.
- Done when:
  - Admin can choose the admission-letter template.
  - Approved parent receives an admission letter PDF/link.
  - The PDF includes student passport and admission-specific details.

### DOC-001 - Shared School Document Template Registry

- Priority: P1
- Goal: Generalize the GND-style template pattern for school documents.
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
- Scope:
  - Add request form for admission letters/forms and result sheets.
  - Allow PDF/image upload and notes.
  - Track request status: submitted, quoted, paid, in build, ready, rejected.
  - Add operator/admin build handoff.
  - Let school select the finished template when ready.
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
- ADM-004 must decide whether "payment link" means internal fee-payment instructions, an online payment provider URL, or both.
- DOC-003 should be constrained JSON, not arbitrary HTML/JS, because templates will render sensitive student documents.
- GND reference direction: prefer typed payloads plus registry-selected HTML/PDF renderers for high-fidelity documents; use JSON templates for simpler, configurable documents.
