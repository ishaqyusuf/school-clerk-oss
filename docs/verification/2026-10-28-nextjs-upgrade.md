# Next.js upgrade — 28 October 2026

Upgraded all three web apps, shared UI and tenant-url from 16.3.0 to 16.4.3,
with matching @next/mdx and eslint-config-next. Existing caret range style and
React versions are preserved. Two type compatibility adjustments retain behavior:
quantity input uses InputEventHandler for onInput; enrollment treats a FormData
iterator value as unknown before applying its existing File/size/requirement guard.

Source: https://registry.npmjs.org/next/latest and
https://nextjs.org/blog/next-16-4, checked 28 October 2026. Existing Midday workspace
boundaries remain; no architecture, API, permission, schema or provider change.

## Verification

- Bun 1.3.9, Node 25.4.0, macOS arm64. Both normal and frozen dependency installs
  pass with lifecycle scripts disabled. Existing isolated links refreshed with
  `--linker isolated`; all three web apps resolve 16.4.3.
- 35 tenant URL/navigation tests pass with 68 assertions.
- Marketing and Dashboard production Turbopack builds pass. Their pre-existing
  `ignoreBuildErrors: true` settings were retained: those build successes are
  compilation/prerender evidence, not strict type acceptance.
- School-site compiles successfully, then its strict build check fails on five
  existing DB/domain errors in institution-config, module-config,
  student-import-execution and student-profile-update. A fresh check using the
  previously installed 16.3.0 Next types gives exactly the same diagnostic text.
  The additional enrollment File diagnostic under new types is fixed.
- Required `bun run typecheck --continue --concurrency=1` completes 16 of 21 tasks;
  AI/auth/API/dashboard/school-site fail on existing domain/auth diagnostics.
  UI and tenant-url checks pass. Full workspace acceptance remains incomplete.
- Six in-memory cases execute the actual old/new enrollment loops: allowed,
  unknown, empty, text and unrelated upload fields retain the same decisions.
  Quantity input emits byte-identical JavaScript before/after its annotation fix.
- Build-only generated route-import changes restored to their exact original
  bytes. No framework/type validation bypass was introduced.

No active project chat appeared in the 50-chat Codex inventory. Existing shared
servers were not restarted; no idle/paused chat was awakened. No push/deployment,
DB schema change, fixture creation or financial/provider write. This type-only
source work introduces no visual change; browser/native acceptance is unclaimed.
The broad type baseline is a separate repair task, not hidden by this upgrade.
