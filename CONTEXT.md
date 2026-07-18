# School Clerk

School Clerk is a multi-tenant education-operations domain for managing each institution's academic structure, students, assessments, and results.

## Assessment Workbooks

**Assessment Workbook**:
A spreadsheet for one classroom that carries a chosen subset of subjects and score columns between School Clerk and offline score entry.
_Avoid_: Exam spreadsheet, result sheet

**Assessment Column**:
A score column bound to a specific classroom subject assessment.
_Avoid_: Exam column

**Bare Subject Column**:
A score column identified only by its classroom subject; it must be linked to an existing assessment or resolved by creating one before imported scores can be applied.
_Avoid_: Missing assessment, invalid column
