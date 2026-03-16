# ADR-0002: Multi-Institution Configurable Module Architecture

- Status: accepted
- Date: 2026-03-13

## Context
SchoolClerk must support multiple education systems (pre-school, primary, secondary, college/polytechnic, university, training institutes, and religious schools). A single hardcoded academic model cannot cover all institution needs.

## Decision
Adopt a configuration-driven architecture per tenant:
- Every tenant defines an `institutionType`.
- Every tenant defines module toggles (enabled/disabled modules).
- Academic structure is modeled as a flexible hierarchy:
  - Academic Session
  - Term or Semester
  - Level or Class
  - Department (optional)
  - Program (optional)
- Service layer enforces module availability and hierarchy constraints.
- UI and API consume configuration to render institution-specific experiences.

## Consequences
### Positive
- One platform can serve different institution types without forking codebases.
- Modules can be sold/activated based on tenant profile and plan.
- Future institution types can be added with configuration extensions.

### Tradeoffs
- Configuration validation and migration logic become critical.
- QA matrix grows because module combinations vary by tenant.
- Permission checks must account for role and module availability.

## Alternatives Considered
- Hardcode one academic model for all tenants.
- Maintain separate products per institution category.
- Add institution support through ad hoc conditionals without central configuration.

## Follow-up Actions
- Define canonical config schema for institution type, hierarchy config, and module toggles.
- Add API contracts for tenant configuration read/update.
- Add permission matrix by module and institution type.
- Add migration strategy for existing tenants.
