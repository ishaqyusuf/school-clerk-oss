# Local Docker database

This repo can run against a local PostgreSQL instance in Docker.

## What is configured

- `docker-compose.yml` starts PostgreSQL 16 on `localhost:55432`
- `.env.local` should set `LOCAL_DATABASE_URL` for that container
- DB-related scripts load root env files and resolve the active profile to `DATABASE_URL`

## Start the database

```sh
docker compose up -d postgres
```

## Apply local migrations

```sh
bun run db:migrate
```

## Open Prisma Studio

```sh
bun run db:studio
```

## Stop the database

```sh
docker compose down
```
