# Trigger Staff Invitation Email Render Failure

## Date

2026-06-19

## Symptom

The Trigger.dev local worker failed to bundle `send-staff-invitation-email` with `Could not resolve "@school-clerk/email"`. After the worker became ready, the job failed during email rendering with `Objects are not valid as a React child`.

## Root Cause

The job imported the email package root, which was less reliable for Trigger's worker bundling than the package's explicit email-template subpath. Email rendering was also pinned to `@react-email/render@0.0.10`, which brings its own React 18 renderer into a React 19 workspace and rejects React 19 element objects.

## Resolution

The job now imports `StaffInvitationEmail` from `@school-clerk/email/emails/staff-invitation`, renders through the shared `@school-clerk/email/render` helper, and the email package now uses `@react-email/render@1.1.2`, which supports React 19 through peer dependencies.

## Verification

A targeted Bun smoke test from `packages/jobs` rendered the staff invitation email HTML successfully.
