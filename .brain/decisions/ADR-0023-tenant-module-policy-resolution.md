# ADR-0023: Tenant Module Policy Resolution and Persistence

- Status: accepted technical design; activation-authority/default-bundle choice pending
- Date: 2026-09-07

## Decision
Keep requested activation separate from granted capability entitlements. Effective access is the intersection of those sets after checking the complete dependency closure. A grant is not a purchase, a catalog entry is not a released feature, and enabling AI never grants its tools access to disabled domains.

Persist one versioned `SchoolModuleConfiguration` per school, with separate canonical string arrays, an integer optimistic-concurrency revision, timestamps and last actor ID. Validate values using the shared strict module schema at service boundaries. The database unique school key prevents duplicate initial configuration; compare-and-swap writes include school/account/deleted-school predicates and expected revision. Do not store module state in auth cookies, an environment variable, website JSON, or the institution-type column.

Missing configuration and explicitly empty configuration are different. Invalid versions/values fail closed. Legacy adoption and new-institution defaults require an explicit policy; do not reinterpret null as all access once the enforcement layer is enabled. Module deactivation preserves domain records and historical finance/academic relationships.

Navigation is only a presentation consumer. Direct routes, APIs, server actions, public-token services, background jobs, assistant tools and aggregate read models must apply the same effective policy alongside normal ownership and role authorization before the feature is considered complete.

## Dependencies
- Parent portal depends on student management.
- Curriculum depends on academic structure; internal assessment depends on student management and curriculum; reporting depends on assessment.
- Student attendance and admissions depend on students and academic structure; staff attendance stays under staff management.
- Timetable depends on curriculum/staff; assignments on students/curriculum; hostel/transport on students.
- Finance, inventory, library and external-exam catalogs are not universally coupled to student management. Specific student-facing operations require both relevant capabilities separately.

## Compatibility and Rollout
The current legacy navigation option remains distinct from the new complete tenant-module set. A complete empty set never falls back to legacy access. Configuration/settings/auth recovery remains accessible independently of module state.

The early UI slice temporarily retained unprovisioned navigation. Enforcement removes that branch: missing, invalid and failed configuration reads do not grant module access/navigation. Explicit adoption/default provisioning is a release prerequisite. Settings/auth recovery stays available; no bulk configuration or role changes occur implicitly.

Normal module read/write requests carry the displayed school ID in addition to authenticated active-school context. The API requires a match; client caches and dirty forms are keyed by that school. The explicit ID is an identity consistency check, never an alternative authorization source.

Schema rollout is additive and uses only the required guarded local and production Prisma pushes. No bulk grants, module activation, subscription changes, or tenant data deletion are authorized by the schema addition. Runtime enforcement must not be presented as active until storage, adoption, all entrypoint guards and deferred verification are complete.

## Open Product Decisions
The user has been asked whether school admins toggle only within platform grants or freely activate implemented modules. The storage/policy boundary supports either decision without inventing prices or paid bundles. Institution-specific initial bundles and legacy grants remain explicit implementation work.
