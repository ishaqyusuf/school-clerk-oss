# Dashboard Navigation

## Status

Implemented on 2026-08-01. Automated and static verification is complete; authenticated browser/UI QA is intentionally pending at the user's request.

## Purpose

SchoolClerk resolves one role-safe dashboard navigation model from a canonical destination registry. The sidebar renderer consumes that resolved model without knowing about roles, permissions, institution types, tenant modules, or production rollout statuses.

## Ownership Boundary

- `apps/dashboard/src/features/navigation/dashboard-nav-registry.ts` assembles the canonical registry from responsibility-sized files under `dashboard-nav-modules/`; those module files own destinations, labels, section placement, route paths, icons, maturity status, and availability metadata.
- `apps/dashboard/src/features/navigation/dashboard-navigation.ts` owns dashboard workspace profiles: role, module order, default destination, surface mode, and presentation-only section/item ordering or labels where a shared module needs a role-specific IA.
- `packages/navigation` is pure TypeScript. It owns navigation schemas, role normalization, availability-policy intersection, workspace resolution, ordering, defaults, and resolved output types. It must not import React or `@school-clerk/ui`.
- `packages/site-nav` owns React rendering and interaction only. It consumes `ResolvedNavigation` and must not contain role-specific branches or perform access filtering.

Both packages are intentional: `navigation` answers what a user may see; `site-nav` answers how that already-resolved model behaves and looks.

## Navigation Model

The hierarchy is:

`workspace -> module -> section -> destination -> optional child destination`

Availability rules declared at module, section, item, and child levels are intersected. A child cannot replace or broaden an inherited restriction. Profile presentation overrides may regroup, reorder, or relabel already-permitted destinations, but do not duplicate canonical URLs or grant access. The resolver supports:

- normalized role matching;
- permission requirements;
- institution types;
- enabled tenant modules;
- `live`, `beta`, `upcoming`, and `hidden` statuses.

Production dashboard consumers request only `live` destinations. Search, default redirects, and sidebar rendering use the same resolved model, so upcoming or forbidden links cannot leak through a parallel link list.

Navigation visibility is presentation behavior, not route or API authorization. Server-side authorization remains mandatory.

## Role Matrix

| Role | Surface | Modules | Default |
| --- | --- | --- | --- |
| Admin | sidebar | Overview, People, Academics, Finance, Settings; Operations when Inventory is enabled | `/` |
| Teacher | compact | Teaching | `/teacher` |
| Accountant | sidebar | Finance; Operations when Inventory is enabled | `/finance/receive` |
| Registrar | compact | People | `/students/enrollment` |
| HR | compact | People | `/staff/non-teaching` |
| Staff | compact | Overview | `/` |
| Parent | compact | Parent Portal | `/parents` |
| Support | header-only | none | `/notifications` |
| Student | unavailable | none | `/unavailable` |

### Admin

- Overview: Dashboard.
- People: Students, Enrollment, Teachers, Non-Teaching Staff, Departments, Staff Attendance.
- Academics: Overview, Classes, Subjects, Assessment Recording, Class Report Sheets, Student Reports.
- Finance: Overview, collections, payables, accounting, and setup destinations.
- Operations: Inventory only when the tenant's enabled-module input explicitly contains `inventory`.
- Settings: School Profile, Document Templates, Website, and nested Website Media.

Payroll, Tests & Exams, Grading, Academic Session, and Roles & Permissions remain upcoming and do not resolve into production navigation.

### Teacher

The single Teaching module contains Overview, My Classes, My Students, Attendance, Score Entry at `/assessment-recording`, and Reports at `/teacher/reports`. The renderer uses the same section behavior as every other role; there is no Teacher-only UI branch.

### Accountant

Finance contains collections, payables, Transfers, Ledger, and Reconciliation. Operations contains Inventory only after runtime tenant configuration supplies the enabled `inventory` module. Admin-only Finance Overview, Accounts, Fee Structures, and Service Billables stay excluded.

### Registrar

People contains Enrollment and Student Directory. Enrollment remains the default. Student Directory exposure matches the existing authenticated `studentsRouter` Registrar permission contract and does not broaden API access.

### HR

People contains Non-Teaching Staff, Departments, and Staff Attendance. Teacher management and Payroll remain excluded.

### Staff

Staff receives a compact Overview module and a view-only root dashboard. The root no longer redirects Staff into the Teacher-only route group.

### Parent

Parent keeps a compact one-link Parent Portal. Numeric link-count suppression is not used, so the Overview destination remains available.

### Support And Student

Support uses header-only chrome with mobile-visible Notifications and account controls. Student receives an intentional unavailable landing instead of falling through to an administrative or teacher route.

## Interaction Contract

- Desktop dimensions remain 84px collapsed and 268px expanded.
- Multi-module roles receive a module selector; one-module roles receive static module identity.
- Only the selected module's sections render.
- Active routes select their module automatically; explicit selection is retained until the route changes.
- Sidebar, module menu, and account menu share coordinated hover expansion/collapse behavior.
- Nested items support explicit toggle, delayed pointer/focus preview, active-child expansion, scroll-position compensation, and reduced-motion classes.
- Mobile uses an explicit 44px menu trigger and close control, a module selector, close-on-navigation, overscroll containment, and safe-area padding.
- Support retains notification access on mobile even though it has no sidebar.

## Verification

- Pure resolver tests cover the nine-role matrix, inherited-policy intersection, permission/institution/module/status filtering, safe defaults, and upcoming-link exclusion.
- Site-nav tests cover selected-module precedence, active-route specificity, nested exact matching, and deterministic duplicate-href handling.
- Dashboard consumer tests cover default redirects and search visibility.
- A route manifest test confirms every live resolved destination has a Next.js page.
- Navigation, site-nav, and dashboard TypeScript checks pass.
- Authenticated desktop/mobile/browser, keyboard, screen-reader, and visual QA remain pending by explicit request.
