# Platform QA maintenance

- `qaMaintenance.candidates`, `adopt`, `preview`, `start`, and `run` are
  platform-admin-only tRPC operations.

# Student directory

- `students.index` is an authenticated infinite query for the tenant-scoped
  student directory.
- `students.filters` is an authenticated query returning status, session, term,
  and stable classroom-department filter options.
- `students.bulkChangeClass` is an authenticated, management-role mutation that
  moves selected term forms and linked session forms in one transaction.
- `students.bulkDeleteTermSheets` is an authenticated, management-role mutation
  that soft-deletes selected tenant-owned term enrollments.
- All procedures in `studentsRouter`, including overview, duplicate, import, and
  term-form detail operations, now require an authenticated caller.
