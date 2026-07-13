# Reset Password Email URL Staff Invite Parity

## Date

2026-07-13

## Symptom

Password reset email links could be composed with a dashboard tenant URL shape that did not match the working staff invite link shape, especially in local/LAN development where invite links use path-style URLs.

## Root Cause

The staff invite flow owned its own dashboard email URL builder, including development network-host and path-style tenant handling. The forgot-password flow used a separate tenant URL builder for dashboard-subdomain fallbacks, so the two reset-password email flows could drift.

## Resolution

The staff invite URL logic now lives in `apps/dashboard/src/actions/tenant-email-url.ts`. Staff onboarding links and forgot-password reset links both use that helper when composing tenant dashboard reset-password URLs.

## Verification

`bun --filter @school-clerk/dashboard typecheck`
