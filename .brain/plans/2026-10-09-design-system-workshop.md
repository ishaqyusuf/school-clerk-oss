# Design-system workshop — 2026-10-09

## Status

Awaiting owner review. No product code has changed. Nothing will be implemented until the owner picks a direction, or a combination of parts.

## Why

The dashboard's visual language is adapted from Midday: a monochrome icon rail that expands on hover, square badges and small grey text. The owner wants a unique, high-quality design system on **standard shadcn/ui**. It should cover marketing, signup and full onboarding, the dashboard (shell, tables, forms, side sheets, dialogs) and the website-generator editor. This follows the same shell-and-table style-guide approach used for ewatrade.

## Artifact

- Hub: `artifacts/design-system-workshop/index.html`. Preview it with the `design-system-workshop` entry in `.claude/launch.json` on port 4471.
- Builder contract: `artifacts/design-system-workshop/BRIEF.md`. It holds the product truth, per-surface requirements and per-direction specs.
- Shared primitives: `shared/shadcn.css`, which follows shadcn v4 new-york anatomy and token names. Shared sample data lives in `shared/data.js`: Kingsway Academy, 2026/2027 First Term.
- Each direction folder has `tokens.css` plus five surfaces: `marketing.html`, `signup.html`, `dashboard.html`, `components.html` and `website.html`.

## Directions

| ID | Name | Idea | shadcn shell | Tokens |
|---|---|---|---|---|
| 01 | Registry | The school's register, beautifully kept. Evolves Academic Evergreen (ADR-0020). | Sidebar `variant="inset"`, dark evergreen frame | Ivory `#f8f6ef`, ink `#13261f`, primary `#165c42`, seal gold `#c9952a`. Fraunces + Instrument Sans. Radius 0.625rem |
| 02 | Timetable | Everything in its period: dense and keyboard-first | Dark top module tabs + module sub-nav (`collapsible="none"`) | Cool white `#f4f5f7`, ink `#0d1220`, cobalt `#2340d0`, highlighter `#ffdd33`. Schibsted Grotesk + IBM Plex Mono. Radius 0.375rem |
| 03 | Assembly | A friendly school morning, built from the brand mark's colours | Sidebar `variant="floating"`, mobile bottom tab bar | Morning `#f2f4f9`, navy `#0f172a`, sky/teal/amber module tiles. Bricolage Grotesque + Onest. Radius 1rem |

All three directions keep the following:
- the canonical brand mark;
- the tenant-domain model (`{slug}.school-clerk.com` and `dashboard.{slug}.school-clerk.com`);
- tenant-owned website themes, so the website preview never uses the platform palette (ADR-0020);
- marketing-integrity rules: no fabricated logos, testimonials or metrics.

## Workshop QA (2026-10-09)

- **Headless Playwright sweep:** all 15 pages, light and dark, at 390 and 1440, plus 768, 1024 and 1280. No console errors and no horizontal overflow.
- **Signup → onboarding:** walked end to end for all three directions on desktop, and on mobile in dark mode for 01 and 02.
- **Shared fixes made during QA:**
  - `[hidden]` now wins over component `display` rules, so closed dialogs no longer cover the page.
  - `.table-wrap` is positioned, so `sr-only` cells can't escape the scroll wrapper.
  - `.btn-link` resets the browser's default button border.
  - Sample fee totals now match the fee schedule: ₦205,500 for returning students and ₦208,000 for new students.
- **Suggestion recorded on the hub:** 01 Registry as the base, with 02's keyboard and dense tables for finance and 03's mobile tab bar and checklist onboarding. This is not an owner decision.

## Follow-ups after a choice

1. Record the chosen direction as an ADR. If the palette changes, it supersedes or extends ADR-0020.
2. Port the chosen `tokens.css` into `packages/ui/src/styles/globals.css`, `apps/dashboard` and `apps/marketing`. Add the extra semantic tokens: `--success`, `--warning`, `--info`, `--highlight`, density and fonts.
3. Replace the site-nav rail (`packages/site-nav`) with the chosen shadcn Sidebar variant. Restyle the shared table core, `CustomSheet` and `CustomModal` to the chosen anatomy.
4. Rebuild signup, onboarding and the website editor screens. Then move to the page-specific layout work that falls outside the standard table, which the owner flagged as the next phase.
