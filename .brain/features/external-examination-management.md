# External Examination Management

## Purpose
Defines how SchoolClerk manages student registration, payment tracking, candidate data, and results for external examination bodies.

## How To Use
- Update when external exam workflows, statuses, or integrations change.
- Keep data model, APIs, and permissions aligned.
- Use this as implementation reference for exam-body-agnostic support.

## Feature Name
External Examination Management

## Goal
Support school-managed registration and tracking for national and international external exams through one configurable module.

## Users
- School admins
- Exam officers
- Account/finance officers
- Students (view/download slips and status)

## Scope and Institution Fit
- Most relevant for: Secondary schools, colleges, tutorial/training centers.
- Usually disabled for: Preschools and most primary schools.
- Module must be toggleable per tenant.

## Supported Exam Bodies (Examples)
- WAEC
- NECO
- JAMB
- IJMB
- NABTEB
- Cambridge Assessment
- SAT/TOEFL/IELTS providers
- Any custom exam body configured by tenant/admin

## Flow
1. Admin defines or selects external exam body and exam type/year.
2. Admin configures exam settings (registration deadline, exam center options, allowed subjects, fees).
3. Candidates are created from students (single or bulk).
4. Candidate subjects are selected and validated.
5. Payment is recorded and candidate status is updated.
6. Final submission is performed before deadline.
7. Candidate slip is generated for print/download.
8. External results are recorded/imported and analytics are generated.

## Data Model
## Conceptual Entities
- `ExternalExamBody`
- `ExternalExam`
- `ExternalExamSubject`
- `ExamCenter`
- `ExamCandidate`
- `CandidateSubject`
- `CandidatePayment`
- `CandidateDocument`
- `CandidateResult`

## Core Candidate Fields
- Full name
- Gender
- Date of birth
- Passport photograph
- Candidate number/registration number
- Selected subjects
- Assigned exam center
- Registration status
- Payment details

## Registration Status
- `DRAFT`
- `REGISTERED`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`

## APIs
- External exam body management
- External exam/session setup
- Candidate registration (single and bulk)
- Subject assignment and validation
- Payment status update
- Deadline validation and submission
- Result entry/import
- Candidate export and slip generation
- Exam analytics retrieval

## UI/UX Notes
- Bulk-first experience for high candidate volume.
- Deadline countdown and warning banners.
- Clear status chips and action guards by status.
- Printable/downloadable registration slips and subject summaries.

## Permissions
- School admin/exam officer: full access to setup, registration, and submission.
- Finance officer: payment update access.
- Student/parent roles: read-only access to own slips/status where enabled.
- All operations are tenant-scoped.

## Edge Cases
- Late registration attempts after deadline.
- Candidate without required documents.
- Subject selections outside exam-allowed set.
- Exam center capacity or eligibility constraints.
- Payment recorded but registration not submitted.
- Candidate number reassignment or correction.

## Analytics
- Pass rate by exam body and exam year.
- Subject-level performance trends.
- Score distribution (for exams like JAMB/SAT style scoring).
- Submission completion rate before deadline.

## Integrations (Future)
- Exam-body result verification APIs.
- JAMB CAPS or equivalent admission systems.
- Result import/scraping connectors where legally permitted.

## Open Questions
- Canonical DB schema for external exam entities in `packages/db`.
- Integration policy and compliance requirements per exam body.
- Document storage limits and retention policy for uploaded exam files.
