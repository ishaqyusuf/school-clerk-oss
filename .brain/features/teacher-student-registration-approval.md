# Teacher student registration approval

Status: Local implementation and focused service QA; authenticated browser QA pending.

Teachers with access to a classroom can add a student from their classroom
workspace or assessment recording sheet. The request creates a provisional
student, session enrollment and term enrollment with `PENDING` review status.
The student immediately appears in the teacher's classroom roster with a
pending badge and can receive attendance and assessment scores.

Admins and Registrars review submissions at `/students/approvals`. The detail
sheet shows the submitted identity and possible existing students in the same
school, including previous term history and an already-in-term indicator. The
reviewer can approve a new identity, approve while matching a historical
identity, or reject with an optional note. Matching is refused when that
existing identity already has a record in the submitted term. The provisional
term form and its attendance/score work remain; score records and their history
are reassigned to the matched canonical student. The unused provisional
identity is soft-deleted.

Rejected requests keep their review record and badge but are excluded from
active attendance and assessment recording/printing surfaces. Attendance
records created while pending are preserved. Review actions require tenant
scope, an active/open term, and current pending status. See
[ADR-0063](../decisions/ADR-0063-provisional-student-term-review.md).

## Verification and rollout

- Local Daarul Hadith service QA passed for teacher submission, pending roster,
  rejection, historical match suggestions, and score transfer. Test records
  were cleaned up.
- Focused assessment route/print/workbook tests passed.
- Authenticated Daarul Hadith browser QA passed admin add/approve with score
  preserved; teacher add with pending badges in the student, attendance and
  assessment rosters; admin review suggestion and unapproved decision; and
  rejected roster exclusion. The two synthetic browser students and one test
  score were removed from the local database afterward.
- Browser automation repeatedly targeted the neighboring score cell in the
  RTL table, including on unrelated controls, so teacher score saving was not
  attempted on this pass; this is not yet confirmed as an application bug.
  Attendance saving was also not exercised in browser QA because
  the form would mark the entire real class present. The focused service QA
  covers pending attendance retention and score transfer.
- Local Prisma schema push succeeded. Production schema push remains outside
  this local-only QA round.
