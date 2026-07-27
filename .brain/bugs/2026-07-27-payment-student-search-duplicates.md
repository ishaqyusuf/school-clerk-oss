# Payment Student Search Duplicates

## Symptom

The Receive Student Payment picker showed students from historical terms alongside current registrants. A student with records across terms could therefore appear more than once by name, with different classroom or term subtitles.

## Root Cause

`finance.searchStudentsForPayment` queried the canonical student table but did not let the simple payment form constrain students or nested term forms to the active dashboard session and term. It then displayed the most recently created term form, which could belong to a historical accounting period. Historical and current canonical rows with the same name therefore appeared together in the visible picker.

## Resolution

The simple sheet opts into a current-term-only search. That mode starts from tenant-owned, non-deleted canonical students that have a non-deleted registration in the active dashboard session and term. Nested classroom and term metadata use that same active registration, and the Prisma query explicitly returns distinct student IDs. An incomplete active session/term context returns no candidates.

Historical term payments remain available after a current student is selected through the separate **Paying for** selector.
Advanced payment and other finance selectors retain the existing all-term search behavior.

## Verification

- Focused finance tests assert the canonical student query, active registration filters, current-term display metadata, distinct student IDs, and empty behavior without a complete active term context.
- Authenticated browser QA confirmed that the `1447/1448 · 2nd Term` picker contains only second-term registrations and no longer repeats names because of historical term forms.
- No payment was submitted during verification.

## Related Files

- `apps/api/src/db/queries/finance.ts`
- `apps/api/src/db/queries/finance.test.ts`
- `apps/api/src/trpc/schemas/finance.ts`
- `apps/dashboard/src/components/sheets/receive-payment-sheet.tsx`
- `.brain/api/finance-payments.md`
- `.brain/features/student-fees.md`
