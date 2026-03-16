# API Permissions

## Purpose
Defines access control rules for each API surface.

## How To Use
- Update when roles or authorization behavior changes.
- Keep permission mapping by module.
- Include tenant boundary rules.

## Template
## Roles
- Super Admin
- School Admin
- Teacher
- Parent
- Student
- Finance Officer

## Permission Matrix
- Student Management: TBD by role
- Admissions: TBD by role
- Attendance: TBD by role
- Results: TBD by role
- Billing and Payments: TBD by role
- Notifications: TBD by role

## Security Rules
- Role checks happen server-side.
- Tenant membership required for all tenant routes.
- Sensitive actions require audit logging.
