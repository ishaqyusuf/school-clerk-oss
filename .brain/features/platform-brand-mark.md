# Platform Brand Mark

## Purpose

Defines how the School Clerk platform mark is rendered in browser tabs and
platform-owned navigation surfaces.

## Current Behavior

- The canonical mark keeps the navy rounded tile, three record nodes, white
  connecting path, and amber endpoint.
- The visible artwork occupies roughly 92% of its square canvas so it remains
  optically comparable to standard browser favicons and header marks.
- SVG is the primary browser and header format for crisp rendering at small
  sizes. A 128px PNG remains available as the favicon and Apple touch fallback,
  and the marketing app retains a generated ICO fallback.
- Development uses the same geometry with a rose/red palette so local tabs are
  distinguishable from production without changing the mark's silhouette.
- Dark surfaces use the inverse light-tile variant; light surfaces use the navy
  tile variant.

## Runtime Ownership

- `apps/marketing`, `apps/dashboard`, and `apps/school-site` each expose the
  shared platform mark from their own `public` directory.
- The app metadata registers one explicit SVG icon first and a PNG fallback.
  Full header logo variants must not be registered as competing favicon links.
- Platform header/sidebar marks render at 34-36px where space permits, with the
  same tightly cropped master asset supplying the optical size.

## Accessibility

- Visible brand marks use the accessible name `School Clerk`.
- Theme-alternate duplicate images are hidden from assistive technology.
