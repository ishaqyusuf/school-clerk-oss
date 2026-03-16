# Multi-Institution Module Configuration

## Purpose
Defines how modules are enabled or disabled per tenant based on institution type and business plan.

## How To Use
- Update when modules are added/renamed.
- Keep module matrix aligned with API permissions and UI navigation.
- Reference this file when onboarding new institution categories.

## Feature Name
Multi-Institution Module Configuration

## Goal
Support small schools, universities, training institutes, and religious schools on one platform by enabling relevant modules per tenant.

## Users
- Platform admins
- School admins
- Implementation/onboarding teams

## Flow
1. Create tenant and set `institutionType`.
2. Select module set for tenant.
3. Platform exposes enabled modules in web/mobile navigation.
4. API and services enforce disabled module access as forbidden.

## Data Model
- Tenant configuration object (planned):
  - `institutionType`
  - `enabledModules[]`
- Module identifiers (planned examples):
  - `STUDENT_MANAGEMENT`
  - `PARENT_PORTAL`
  - `STAFF_MANAGEMENT`
  - `ACADEMIC_PROGRAMS`
  - `COURSES_SUBJECTS`
  - `TIMETABLE`
  - `ATTENDANCE`
  - `ASSESSMENT_AND_EXAMS`
  - `RESULTS_AND_REPORTS`
  - `ADMISSION_ENROLLMENT`
  - `BILLING_FINANCE`
  - `COMMUNICATION`
  - `ASSIGNMENTS`
  - `LIBRARY`
  - `HOSTEL`
  - `TRANSPORT`
  - `INVENTORY_ASSETS`
  - `AI_ASSISTANT`

## APIs
- Get tenant module configuration.
- Update module configuration.
- Validate module access for route guards.

## UI/UX Notes
- Hide disabled modules from sidebars and dashboards.
- Show admin controls for module activation with clear dependency warnings.
- Use institution-specific defaults during onboarding.

## Permissions
- Platform admin can manage all tenant configurations.
- School admin can manage own tenant configuration (subject to plan constraints).
- Non-admin roles have read-only access to active modules.

## Edge Cases
- Existing data in a module that is later disabled.
- Role has permission but module is disabled.
- Institution default conflicts with paid add-on activation.

## Metrics
- Time to onboard a tenant configuration.
- Module adoption rate by institution type.
- Access-denied incidents due to configuration mismatches.

## Open Questions
- Canonical module dependency graph.
- Billing integration for add-on activation.
- Versioning strategy for tenant configuration schema.
