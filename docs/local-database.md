# Local Docker database

This repo can run against a local PostgreSQL instance in Docker.

## What is configured

- `docker-compose.yml` starts PostgreSQL 16 on `localhost:55432`
- `.env.local` points `POSTGRES_URL`, `DIRECT_URL`, and `DATABASE_URL` to that container
- DB-related scripts now prefer `.env.local` when it exists

## Start the database

```sh
docker compose up -d postgres
```

## Apply the Prisma schema

```sh
bun run db:push
```

## Open Prisma Studio

```sh
bun run db:studio
```

## Stop the database

```sh
docker compose down
```
