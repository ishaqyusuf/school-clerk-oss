# Define Duplicate Identity

Labels: `wayfinder:grilling`
Status: Open
Blocked by: None
Blocks: `002-inventory-merge-owned-records.md`, `005-design-student-and-classroom-ui-surfaces.md`

## Question

What exactly counts as a duplicate student in a class for this feature?

## Context

The user’s rule is: there should not be a duplicate name in a particular class. If two students legitimately have the same name, the school should separate them by adding or correcting another name. The system should detect this before an operator accidentally deletes the copy that owns historical records.

## Resolve

- Name normalization rules for duplicate grouping.
- Scope: class/department plus term, class/department plus session, or classroom regardless of term.
- Whether the grouping key is `name + surname`, `name + surname + otherName`, display name, or a more domain-specific identity.
- How to handle legitimate same-name students, such as siblings or unrelated students with identical names.
- Whether adding `otherName` is the recommended separation path for legitimate same-name students.
- Whether duplicate detection should include only exact normalized duplicates in v1 or also likely/fuzzy duplicates.

## Expected Answer

One paragraph defining the canonical duplicate key and warning scope, plus examples of duplicate and non-duplicate cases.

## Approved Comment

For v1, a duplicate means two or more active, non-deleted students enrolled in the same classroom department for the same active term whose normalized full display name is identical. The duplicate key should be `name + surname + otherName`, normalized by trimming, lowercasing, collapsing whitespace, and applying the existing Arabic normalization used by student import. If two students share first name and surname but have different `otherName`, they should not be treated as duplicates, but the UI can still make names easy to inspect. Legitimate same-name students should be separated by adding or correcting `otherName`.
