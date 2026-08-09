# Local PostgreSQL to Neon dev migration

Date: 2026-08-04

## Recommendation

Use a one-time logical PostgreSQL backup and restore with `pg_dump` and
`pg_restore`, targeting a **fresh, empty Neon database or branch**. Do not turn
the current contents into JSON and do not use Prisma seeding as a database
clone mechanism.

PostgreSQL describes `pg_dump` as producing a consistent backup even while the
database is in use, and its custom archive format (`-Fc`) is portable,
compressed by default, inspectable, and selectively restorable with
`pg_restore`. A complete dump includes the database's schema and data; the data
section also carries sequence values, while indexes, triggers, rules, and most
constraints are restored as post-data objects in dependency-aware order.
([PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html),
[PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html))

Neon's own migration guidance uses `pg_dump`/`pg_restore`, and Neon explicitly
requires **direct, non-pooled connections** for these tools because its pooled
endpoint uses PgBouncer transaction pooling and `pg_dump`/`pg_restore` use
session-level `SET` statements.
([Neon migration guides](https://neon.com/docs/import/migrate-intro),
[Neon connection pooling](https://neon.com/docs/connect/connection-pooling))

Prisma's seed facility is for a custom script that inserts required, test, or
initial application data. `prisma db seed` only executes the configured script;
it does not export an existing database. A JSON/Prisma approach would require
custom handling for every table, dependency order, PostgreSQL-native values,
large objects, sequences/identity state, constraints, indexes, triggers,
extensions, and future models. It is useful for a small reusable canonical dev
fixture, not for this complete one-time copy.
([Prisma seeding](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding),
[`prisma db seed`](https://docs.prisma.io/docs/cli/db/seed))

## School Clerk-specific finding

School Clerk already has `bun run db:sync`, but it is not a full clone tool:

- the public router supports local as a source only with preview as the target;
  it has no local-to-dev mode;
- `packages/db/src/local-sync.ts` enumerates application base tables, excludes
  `_prisma_migrations`, classifies some tables as incremental/insert-only/static
  or skipped, and upserts rows;
- it assumes the destination schema already exists and does not transfer roles,
  extensions, schema definitions, indexes, constraints, triggers, or other
  database objects;
- it temporarily changes replication/trigger behavior on the target, which is
  a different operational model from restoring a fresh database and may require
  privileges unavailable or undesirable on managed Postgres.

Therefore, keep `db:sync` for its designed ongoing app-row synchronization
flows. For this one-time local-to-Neon dev cutover, use the native PostgreSQL
archive workflow. Do not temporarily masquerade `.env.dev` as `.env.preview`.

The repository currently has an SQL migration that installs `pg_trgm` and many
defaults using `gen_random_uuid()`. The extension preflight below is therefore
not theoretical: at minimum, confirm `pg_trgm` compatibility/availability on
the selected Neon Postgres version before restoring.

## Rollback-friendly procedure

### 1. Keep the source and target unambiguous

- Keep `.env.local` pointing at the local Docker PostgreSQL database.
- Keep `.env.dev` pointing at the new Neon dev database.
- Retrieve a **direct** Neon URL from the Neon Console for the migration. Its
  hostname does not contain `-pooler`. The application may use a pooled URL
  afterward; only the administrative migration path must be direct.
- Do not print URLs, commit them, or paste real credentials into this note.
  Prefer a temporary password file selected with `PGPASSFILE`; PostgreSQL
  requires password-file permissions to exclude group/world access on Unix.
  ([PostgreSQL password file](https://www.postgresql.org/docs/current/libpq-pgpass.html))
- Write the dump to a private path outside the repository. It contains the
  complete development dataset and should be treated as sensitive.

### 2. Preflight versions, extensions, and target emptiness

Using `psql` separately against the local direct URL and Neon direct URL, record:

```sql
SELECT version();
SELECT current_database(), current_user;
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

Also verify that the Neon target contains no application tables or data. A
restore into a brand-new Neon database/branch is safer than trying to merge into
an already Prisma-pushed or partially seeded target.

Use a `pg_dump` client whose major version is at least the source server's
version. The safest cross-host setup is a target on the same major version as
the source, with matching client tools. PostgreSQL supports dumping older
servers with newer `pg_dump`, but `pg_dump` refuses a newer server than itself,
and loading into an older server is not guaranteed.
([PostgreSQL version compatibility](https://www.postgresql.org/docs/current/app-pgdump.html))

Compare the local extension list with [Neon's supported extensions](https://neon.com/docs/extensions/pg-extensions).
Neon is managed Postgres: it provides `neon_superuser`, not the unrestricted
Postgres superuser, and can install only extensions supported by Neon.
([Neon compatibility](https://neon.com/docs/reference/compatibility))

### 3. Quiesce local writes for the final copy

`pg_dump` takes a consistent snapshot without blocking readers or writers, but
writes committed after that snapshot will not be in the archive. Stop local app
writes and background jobs for the final dump, or accept the dump's snapshot as
the explicit cutoff point.
([PostgreSQL `pg_dump` consistency](https://www.postgresql.org/docs/current/app-pgdump.html))

### 4. Create a custom-format archive

Use placeholders or secure libpq password handling; never put real URLs in
versioned scripts:

```sh
pg_dump \
  --format=custom \
  --verbose \
  --file="<PRIVATE_PATH>/school-clerk-local-2026-08-04.dump" \
  --dbname="<LOCAL_DIRECT_DATABASE_URL>"
```

Check every warning. Then inspect the archive table of contents without making
database changes:

```sh
pg_restore \
  --list \
  "<PRIVATE_PATH>/school-clerk-local-2026-08-04.dump"
```

For a large database, keep dump and restore as separate operations instead of
piping them; Neon notes that a long-running pipe is more susceptible to failure.
([Neon dump/restore guidance](https://neon.com/docs/import/migrate-from-neon))

### 5. Restore into the fresh Neon target

For a normal-sized development database, prefer an all-or-nothing restore:

```sh
pg_restore \
  --verbose \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --dbname="<NEON_DIRECT_DATABASE_URL>" \
  "<PRIVATE_PATH>/school-clerk-local-2026-08-04.dump"
```

Why these options:

- `--single-transaction` makes the restore all-or-nothing and implies
  `--exit-on-error`. It is a strong default for a modest development database;
  for a very large archive it may consume too many locks and cannot be combined
  with parallel restore, so use `--exit-on-error` plus a disposable fresh Neon
  branch instead.
- `--no-owner` avoids restoring local `ALTER OWNER`/session-authorization
  statements that would fail unless the destination user were the original
  owner or an unrestricted superuser. Objects become owned by the Neon restore
  role.
- `--no-privileges` avoids replaying grants/revokes for local-only roles.
- `--no-tablespaces` avoids references to local filesystem tablespaces that a
  managed service does not expose.

These behaviors are defined by
[PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html).
Neon also recommends `--no-owner` when restoring between managed projects to
avoid ownership failures.
([Neon ownership guidance](https://neon.com/faqs/change-region-existing-neon-project))

Do **not** add `--clean` unless the exact target has been independently verified
and approved for destruction: `--clean` drops every archive-matching target
object before restoring it. A fresh database/branch makes `--clean` unnecessary.
([PostgreSQL destructive restore options](https://www.postgresql.org/docs/current/app-pgrestore.html))

### 6. Handle roles and privileges deliberately

`pg_dump` backs up one database; cluster-global roles and tablespaces belong to
`pg_dumpall`, not `pg_dump`. Do not restore the local cluster's global-role dump
wholesale into Neon. Neon has a managed role model and no unrestricted
`postgres` superuser.
([PostgreSQL `pg_dumpall`](https://www.postgresql.org/docs/current/app-pg-dumpall.html),
[Neon roles/compatibility](https://neon.com/docs/reference/compatibility))

Instead:

- restore as the intended Neon owner role with `--no-owner --no-privileges`;
- if the runtime application uses a separate Neon login, create/manage that role
  through Neon and explicitly grant only the required database, schema, table,
  sequence, and function privileges after the restore;
- recreate any intentional role/database settings manually after reviewing
  them; do not copy local passwords or local superuser grants.

### 7. Verify before cutover

Treat a zero-exit restore with no warnings as necessary but not sufficient:

1. Run `ANALYZE`; PostgreSQL dump files do not contain optimizer statistics, and
   PostgreSQL recommends analyzing restored tables.
   ([PostgreSQL restore guidance](https://www.postgresql.org/docs/current/app-pgrestore.html))
2. Compare exact row counts for every application table on local and Neon.
3. Compare schema/table/view/sequence counts, installed extensions, constraints,
   indexes, and sequence `last_value`/identity behavior.
4. Check `_prisma_migrations` only as historical evidence if present; verify the
   live schema against the checked-in Prisma schema using the repository's
   non-destructive validation path. Do not run a destructive reset or force a
   schema push.
5. Connect with the application role and exercise representative reads and
   writes: authentication/tenant resolution, students, finance, one UUID-backed
   insert, and one sequence/identity-backed insert if any exists.
6. Only after verification, point the dev runtime at Neon (normally using the
   pooled application URL) and keep the direct URL for administrative tools.

One reusable exact-count script for `psql` is:

```sql
CREATE TEMP TABLE migration_table_counts (
  table_name text PRIMARY KEY,
  row_count bigint NOT NULL
);

SELECT format(
  'INSERT INTO migration_table_counts SELECT %L, count(*) FROM %I.%I;',
  schemaname || '.' || tablename,
  schemaname,
  tablename
)
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename
\gexec

TABLE migration_table_counts;
```

Run it independently on both databases, save the outputs outside the repo, and
diff them. This avoids relying on approximate planner statistics.

### 8. Rollback and cleanup

- Do not delete the local Docker volume or archive immediately. Keep both until
  the Neon-backed dev workflow has been stable for an agreed observation period.
- If restore or verification fails, discard the disposable Neon database/branch,
  correct the incompatibility, create another empty target, and restore again.
- If application cutover fails, restore `.env.dev` to its prior target or resume
  `.env.local` development; no local data was mutated by `pg_dump`.
- Once accepted, securely delete the dump copy according to the project's data
  handling policy and then retire local PostgreSQL separately. Do not combine
  successful migration verification with immediate source deletion.

## Decision summary

For this repository, the best path is:

**fresh Neon dev database/branch → preflight versions/extensions → quiesce local
writes → custom-format `pg_dump` to a private file → direct-connection
`pg_restore` with no owner/ACL/tablespace replay → `ANALYZE` and exact
verification → switch the dev runtime → retain local rollback copy temporarily.**

JSON plus Prisma seed should be reserved for a deliberately curated,
repeatable development fixture after this migration, not used as the migration
itself.
