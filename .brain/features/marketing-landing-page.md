# Marketing Landing Page

## Purpose

Defines the public SchoolClerk product story, visual direction, responsive
behavior, and truthful marketing constraints for the platform-owned landing
page.

## Current Behavior

- The landing page follows a Veracross-inspired editorial SaaS direction: a
  restrained header, dark evergreen hero, large serif product promise, original
  product UI preview, connected-workflow narrative, role-specific workspaces,
  adoption guidance, pricing, FAQ, and a final conversion call to action.
- The primary message is problem-first: admissions, academics, attendance,
  finance, results, staff, and family communication operate from one connected
  system instead of scattered tools.
- Demo links use `NEXT_PUBLIC_BOOK_DEMO_URL` when configured and otherwise fall
  back to the SchoolClerk contact email. Development exposes the existing tenant
  picker and dashboard sign-up route; production omits the self-serve sign-up
  action until it is deliberately enabled.
- Institution-fit language covers pre-school, primary, secondary, college,
  polytechnic, university, training institute, and religious school
  configurations.
- Pricing uses the current product ranges: a one-time setup of
  `₦50k–₦200k`, a monthly platform range of `₦10k–₦50k`, and separately scoped
  optional add-ons.
- Shared marketing links publish a branded 1200×630 Open Graph image and the
  existing product description through Open Graph and Twitter large-image
  metadata.

## Page Structure

1. Fixed responsive navigation with platform, workflow, role, pricing, and demo
   actions.
2. Hero with one product promise, two conversion actions, onboarding assurances,
   and an original dashboard preview.
3. Institution-fit proof strip without fabricated customer logos or adoption
   claims.
4. Connected admissions, school-day, and finance workflow narrative.
5. Platform modules for academic structure, finance, and family communication.
6. Accessible role tabs for administrators, bursars, teachers, and parents.
7. Migration, tenant/role-aware access, and rollout support commitments.
8. Pricing, semantic FAQ disclosures, final CTA, and footer navigation.

## Visual System

- Platform-owned light surfaces use warm ivory (`#faf8f2`) with dark evergreen
  text (`#102820`).
- The primary action color is academic green (`#146b4a`); pale green surfaces
  use `#e2f2e9`, and gold (`#d9a533`) is reserved for small highlights and data
  accents.
- Dark mode uses deep evergreen (`#0e1d18`) with a brighter green primary
  (`#68c79b`).
- Instrument Sans is the platform sans-serif. Fraunces is reserved for large
  editorial marketing headings.
- Semantic theme variables are shared by the marketing app, dashboard app, and
  `@school-clerk/ui`. Tenant school-site themes continue to own their public
  website colors and are not overwritten by the platform palette.

## Accessibility And Responsive Behavior

- Navigation uses an explicitly labelled compact menu below the large
  breakpoint so tablet users retain every primary destination.
- Role tabs expose `tablist`, `tab`, and `tabpanel` semantics, use roving focus,
  and support Arrow Left/Right, Home, and End keyboard navigation.
- Decorative icons are hidden from assistive technology, headings remain
  hierarchical, and FAQ content uses native `details`/`summary` disclosure.
- Reduced-motion preferences disable smooth scrolling and non-essential
  transitions.

## Marketing Integrity

- Do not add customer logos, user counts, ratings, testimonials, uptime claims,
  security certifications, or performance percentages unless the claim is
  verified and its source is retained.
- Product previews may use illustrative institution names and sample operational
  data, but they must be presented as interface examples rather than customer
  evidence.

## Validation

- Marketing production build and focused TypeScript validation pass.
- Dashboard and shared UI package typechecks pass with the shared semantic
  palette.
- Browser QA covers desktop and mobile rendering, the mobile menu, pointer and
  keyboard role switching, accessible state changes, and console errors.
