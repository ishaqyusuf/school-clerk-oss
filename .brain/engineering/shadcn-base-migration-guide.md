# Shadcn Base Migration Guide

## Goal

Transform this monorepo toward:

```bash
bunx --bun shadcn@latest init --preset b2D0wqNxT --base base --template next --monorepo
```

with these additional migrations:

- `lucide-react` -> Hugeicons
- Radix primitives -> `base`
- all icon usage -> package UI `Icons` registry

## Current Repo Reality

As of April 3, 2026, this repository is not yet on the new `base` shape:

- root package manager: `bun@1.2.16`
- monorepo: yes
- `packages/ui/components.json` exists
- `packages/site-nav/components.json` exists
- current `components.json` files do not declare `base`
- current icon library is `lucide`
- `packages/ui` still depends heavily on `@radix-ui/*`
- approximate migration scope:
  - `99` files importing `lucide-react`
  - `42` files importing `@radix-ui/*`

This means the migration is not just a preset refresh. It is a component-platform migration centered on `packages/ui`.

## Recommended Strategy

Do this in four phases instead of one large rewrite:

1. Capture the new shadcn config and token structure.
2. Migrate shared UI primitives in `packages/ui`.
3. Migrate app usage from Lucide to Hugeicons.
4. Remove leftover Radix-only and Lucide-only dependencies.

Do not start by mass-replacing app files first. Most downstream churn comes from primitives exported by `@school-clerk/ui`.

## Phase 1: Initialize the New Preset

Run the preset from the workspace root:

```bash
bunx --bun shadcn@latest init --preset b2D0wqNxT --base base --template next --monorepo
```

Recommended approach for this repo:

- use a branch dedicated to the migration
- prefer config-first merge, not blind overwrite of every component
- compare `components.json`, global CSS, and generated registry expectations before replacing custom files

Expected outcomes:

- `components.json` gains `base: "base"`
- the project aligns with the preset’s Next.js monorepo expectations
- future `shadcn add` operations generate `base`-style components instead of Radix-style ones

## Phase 2: Update `components.json`

You will likely need both `packages/ui/components.json` and `packages/site-nav/components.json` aligned to the new target.

Target shape:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "base": "base",
  "iconLibrary": "hugeicons",
  "tailwind": {
    "config": "",
    "css": "src/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "src/components",
    "utils": "@/utils",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "ui": "@/components"
  }
}
```

Notes:

- keep existing aliases unless the preset proves they must change
- if only `packages/ui` is the source of shared components, migrate that package first and update `packages/site-nav` second
- after editing `components.json`, regenerate or diff components instead of hand-assuming new APIs

## Phase 3: Radix -> Base Migration

### What changes conceptually

Current repo patterns are mostly Radix-based:

- `asChild`
- `@radix-ui/react-slot`
- primitive namespaces like `DialogPrimitive.Root`
- imports from `@radix-ui/react-*`

Base-oriented code usually shifts toward:

- `render` in places where Radix used `asChild`
- base-owned primitives instead of direct `@radix-ui/*` dependencies
- slightly different trigger/content composition rules depending on generated component output

### Highest-priority files

Start with `packages/ui/src/components/*`, especially:

- overlay components: dialog, sheet, popover, dropdown-menu, alert-dialog, hover-card
- selection/input components: select, checkbox, switch, radio-group, tabs, toggle-group
- structural utilities: button, sidebar, form, command, breadcrumb

### Migration rule

For each shared component:

1. Run the preset init first.
2. Preview the new shadcn output for that component.
3. Compare generated `base` output against the local component.
4. Merge upstream structure into the local file while preserving local styling and exports.
5. Fix downstream usage only after the shared component API is stable.

### Typical replacement pattern

Before:

```tsx
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>
```

After in `base`-style APIs:

```tsx
<DialogTrigger render={<Button>Open</Button>} />
```

Before:

```tsx
import { Slot } from "@radix-ui/react-slot";
```

After:

- remove direct Radix `Slot` usage where the regenerated `base` component no longer needs it
- if a polymorphic pattern is still needed, follow the regenerated component contract rather than preserving the old Slot-based abstraction

### Important caution

Do not mass-delete `@radix-ui/*` dependencies up front. Some files in `apps/dashboard` and `apps/api` directly import Radix types or primitives today, for example:

- `apps/api/src/type.ts`
- `apps/dashboard/src/types.ts`
- `apps/dashboard/src/components/menu.tsx`

These must be migrated or isolated before dependency cleanup.

## Phase 4: Lucide -> Hugeicons Migration

### Non-negotiable repo rule

All icon usage should route through the package UI icon registry.

Target import for app and feature code:

```tsx
import { Icons } from "@school-clerk/ui/icons";
```

Do not allow:

- direct `lucide-react` imports in app code
- direct Hugeicons imports in app code
- new app imports from `@school-clerk/ui/custom/icons`

The icon vendor should be an implementation detail hidden behind `Icons`.

### Config change

Set:

```json
"iconLibrary": "hugeicons"
```

in the relevant `components.json` files.

### Dependency change

Add Hugeicons packages required by the preset or chosen icon flavor, then remove `lucide-react` only after all imports are gone.

Current state:

- `lucide-react` is used in app code and shared UI code
- `packages/ui` exports components that directly import Lucide icons

### Required architecture change

Before doing bulk replacement, consolidate on one public icon module in `packages/ui`.

Recommended target:

- keep [packages/ui/src/components/icons.tsx](/Users/M1PRO/Documents/code/school-clerk/packages/ui/src/components/icons.tsx) as the canonical registry
- migrate useful entries from [packages/ui/src/components/custom/icons.tsx](/Users/M1PRO/Documents/code/school-clerk/packages/ui/src/components/custom/icons.tsx) into that registry or re-export them from there
- standardize on `@school-clerk/ui/icons` as the only public import path for icons

That means:

- app code imports `Icons`
- shared components import `Icons`
- direct icon-library imports are allowed only inside the central registry during migration
- after migration, `Icons` should internally resolve to Hugeicons or custom SVGs only

### Migration order

1. Consolidate icon exports into `@school-clerk/ui/icons`.
2. Convert `packages/ui` internal icon imports first.
3. Convert `apps/dashboard`, `apps/web`, and `packages/site-nav` to use `Icons`.
4. Remove `@school-clerk/ui/custom/icons` usage from app code.
5. Remove `lucide-react` from package manifests only when `rg 'lucide-react'` returns no hits outside the temporary registry migration layer.

### Example import migration

Before:

```tsx
import { ArrowUpCircle, Check, X } from "lucide-react";
```

After:

```tsx
import { Icons } from "@school-clerk/ui/icons";
```

### Example usage migration

Before:

```tsx
<ArrowUpCircle className="h-4 w-4" />
```

After:

```tsx
<Icons.ArrowUpCircle className="h-4 w-4" />
```

### Practical mapping advice

Lucide and Hugeicons names are not one-to-one. Use a mapping pass instead of a blind search/replace:

- `X` often becomes `Cancel01Icon` or `MultiplicationSignIcon`
- `Check` often becomes `CheckmarkCircle02Icon` or `Tick02Icon`
- `ChevronDown` often becomes `ArrowDown01Icon` or a chevron-specific Hugeicon equivalent
- `MoreHorizontal` may become a menu/dots icon, not a literal same-name import

Build a temporary migration table while converting shared components.

### Naming guidance for the registry

Keep the public `Icons` API stable and semantic where possible.

Prefer:

- `Icons.Close`
- `Icons.Check`
- `Icons.ChevronDown`
- `Icons.MoreHorizontal`
- `Icons.Settings`

over vendor-specific names like:

- `Icons.Cancel01Icon`
- `Icons.Tick02Icon`

This lets the repo switch icon vendors without rewriting app code again.

### Search targets for enforcement

When the migration is done, these should return no app-level hits:

```bash
rg 'from "lucide-react"' apps packages/site-nav packages/ui/src/components --glob '!packages/ui/src/components/icons.tsx'
rg 'from "@hugeicons/' apps packages/site-nav packages/ui/src/components --glob '!packages/ui/src/components/icons.tsx'
rg '@school-clerk/ui/custom/icons' apps packages
```

## Phase 5: Package Cleanup

After the code compiles:

1. remove `lucide-react`
2. remove unused `@radix-ui/*` packages
3. keep any remaining packages still required by non-shadcn code until those consumers are migrated
4. run repo-wide typecheck and app smoke tests

In this repo, dependency cleanup will mostly happen in:

- [packages/ui/package.json](/Users/M1PRO/Documents/code/school-clerk/packages/ui/package.json)
- [apps/dashboard/package.json](/Users/M1PRO/Documents/code/school-clerk/apps/dashboard/package.json)
- [apps/web/package.json](/Users/M1PRO/Documents/code/school-clerk/apps/web/package.json)

## Suggested Execution Order For This Repo

1. Run the new `shadcn init` command on a dedicated branch.
2. Update `packages/ui/components.json` to `base` + `hugeicons`.
3. Regenerate and merge foundational components in `packages/ui`:
   - `button`
   - `dialog`
   - `sheet`
   - `dropdown-menu`
   - `select`
   - `form`
   - `tabs`
   - `checkbox`
   - `switch`
   - `popover`
4. Consolidate all icon access behind `@school-clerk/ui/icons`.
5. Replace Lucide imports inside `packages/ui`.
6. Replace direct Radix imports inside `packages/ui`.
7. Fix downstream breakages in `apps/dashboard`.
8. Migrate `packages/site-nav`.
9. Migrate `apps/web`.
10. Remove unused dependencies.
11. Run `bun run typecheck`, then targeted app builds.

## Verification Checklist

- `components.json` includes `base: "base"`
- `components.json` includes `iconLibrary: "hugeicons"`
- app code imports icons only from `@school-clerk/ui/icons`
- `rg 'lucide-react' packages apps` returns no application hits
- `rg '@radix-ui/' packages apps` only returns intentionally retained files
- `bun run typecheck` passes
- dashboard navigation, dialogs, sheets, selects, dropdowns, and forms still work

## Risks Specific To This Repo

- `packages/ui` is both a design system and a legacy primitives layer, so generated files may not drop in cleanly
- several components expose custom exports and wrappers that will not survive a raw overwrite
- Hugeicons naming differs from Lucide enough that icon migration is partly manual
- app code currently depends on Radix CSS variables like `--radix-*` in some classes, so those usages must be reviewed during component replacement

## Recommended Next Step

If you want to execute this safely, the next practical move is:

1. run the preset command
2. capture the resulting config diffs
3. migrate `packages/ui` shared primitives first
4. only then start the Lucide and direct-Radix cleanup

This repo is a good candidate for an incremental migration, not a one-shot overwrite.
