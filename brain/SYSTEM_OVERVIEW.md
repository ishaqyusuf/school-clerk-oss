# System Overview

## Purpose
High-level description of the SchoolClerk platform architecture, core domains, and deployment model.

## How To Use
- Update when architecture or tenancy model changes.
- Keep module boundaries and platform responsibilities current.
- Link to deeper docs in `brain/system/`, `brain/api/`, and `brain/database/`.

## Template
## Product Summary
- SchoolClerk is a multi-tenant SaaS platform for private schools, colleges, and institutions.
- Goal: digitize administration and remove manual attendance, billing, and student record processes.

## Tenancy Model
- Each school is provisioned as an isolated tenant.
- Default tenant URL pattern: `schoolslug.schoolclerk.app`.
- Optional custom domain support per tenant.

## Core Modules
- Student Management
- Admission Portal
- Attendance
- Examination and Results
- External Examination Management
- Billing and Payments
- Parent Portal
- Staff and Teacher Management
- Communication and Notifications
- Academic Programs
- Courses and Subjects
- Class and Level System
- Timetable
- Assignment and Coursework
- Library Management
- Optional: Hostel Management
- Optional: Transport Management
- Inventory and Assets

## Institution Type Support
- Pre-school
- Primary school
- Secondary school
- College
- Polytechnic
- University
- Training institute
- Religious school

## Configurability Principles
- Platform behavior is configuration-driven, not hardcoded to one education system.
- Modules are enabled or disabled per institution tenant.
- Academic structure is flexible and supports term- or semester-based systems.
- Terminology supports both school and higher-institution language (for example, `subjects` and `courses`).
- External exam support is exam-body-agnostic (national or international), not hardcoded to one country.

## Target Customers
- Primary schools
- Secondary schools
- Colleges
- Education groups

## Revenue Model
- Setup fee range: NGN 50,000 to NGN 200,000
- Monthly SaaS range: NGN 10,000 to NGN 50,000 per school
- Add-ons: AI assistant, SMS notifications, white-label mobile app

## Platform Architecture Snapshot
- Web frontend: Next.js App Router on Vercel
- Mobile app: Expo React Native
- API: tRPC routers
- Business layer: service modules
- Data layer: Prisma repositories on PostgreSQL
- Auth: Supabase Auth
- Async/background work: Trigger.dev
- Transactional email: Resend

## Implementation Reference Guidance
- System design and performance work should regularly draw inspiration from these reference projects:
- `/Users/M1PRO/Documents/code/_kitchen_sink/midday`
- `/Users/M1PRO/Documents/code/plot-keys`
- `/Users/M1PRO/Documents/code/_turbo/gnd`
- During architecture or UI implementation, inspect the most relevant reference for established patterns in code structure, folder layout, page implementation, analytics, widgets, trackers, and adjacent performance techniques.
- Use that inspiration to strengthen consistency and execution quality without copying features that do not match SchoolClerk's domain needs.

## Open Items
- Define tenant isolation strategy (DB-per-tenant, schema-per-tenant, or row-level tenancy).
- Define domain provisioning workflow for custom domains.
- Define billing provider and revenue recognition process.
- Define canonical configuration schema for institution types, module toggles, and academic hierarchy rules.
- Define external exam data model and submission workflow for high-volume candidate registration.
