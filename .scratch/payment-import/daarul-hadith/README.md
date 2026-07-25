# Daarul Hadith Payment Import Source

This folder contains payment records reconstructed from the referenced
`Account Manager Setup` conversation.

## Minimal Import Formats

Student payments:

```csv
date,student_name,payment_type,amount,source_note
```

Staff payments:

```csv
date,staff_name,payment_type,amount,source_note
```

`source_note` is optional. Session and term are selected once for the entire
import and are not repeated in each row.

## Files

- `student-payments.csv`: 89 current-term student payments.
- `student-payments-previous-term.csv`: 2 school-fee payments explicitly
  identified as belonging to the previous term. Import this as a separate batch
  with the previous term selected globally.
- `staff-payments.csv`: 31 confirmed staff wage payments.
- `payment-import-plan.md`: implementation plan for the SchoolClerk payment
  import workflow.

## Reconciled Totals

### Current-term student file

- Rows: 89
- School fees: NGN 201,000
- Entrance forms: NGN 14,000
- Uniforms: NGN 25,500
- Books: NGN 1,700
- Total: NGN 242,200

### Previous-term student file

- Rows: 2
- School fees: NGN 6,000
- Total: NGN 6,000

### Combined student source

- Rows: 91
- School fees: NGN 207,000
- Entrance forms: NGN 14,000
- Uniforms: NGN 25,500
- Books: NGN 1,700
- Total: NGN 248,200

### Staff payments

- Rows: 31
- Confirmed wages paid: NGN 280,500
- `أ. محمد`: NGN 70,000
- `أ. مبارك`: NGN 93,000
- `أ. إبراهيم`: NGN 42,500
- `أ. إصلاح`: NGN 75,000

## Extraction Rules

1. Only user-entered records were treated as source evidence. Assistant totals
   were recalculated and were not trusted when they conflicted with underlying
   entries.
2. Bank credits or debits whose descriptions merely mentioned Madrasah were
   excluded unless the user explicitly identified a student payment stream or
   a staff wage payment.
3. Payables were excluded unless the user explicitly confirmed payment.
4. The repeated 23 Jun wage entry for `أ. محمد` was treated as one payment
   because the same date, payee, and amount were restated.
5. `خديجة` was excluded because the entrance form was marked unpaid.
6. Exact dates were retained where stated or corrected. Blank dates are
   intentional and must be resolved during import review.
7. Four wage payments entered between 2 May and 9 May have unknown exact dates
   and must not be silently assigned a date.
8. Student names preserve the user's final spelling corrections, including
   `إيشولا`.
9. `إبراهيم أبو بكر` and `مؤمنة أبو بكر` were explicitly recorded as payments
   for the previous term while collected on 15 Apr 2026. They are isolated in a
   separate CSV because term is selected globally for an import.

## Import Safety

These CSVs are staging data, not database-ready commands. Names, global terms,
finance streams/items, duplicate warnings, and uncertain dates must be reviewed
before execution.
