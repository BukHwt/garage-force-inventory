# Database & Deployment Playbook

This repo now assumes PostgreSQL for both local development and hosted environments. Use the steps below to stand up a database, apply schema changes, and seed baseline data in a repeatable way.

## 1. Local development

1. Copy the server env template and adjust if needed:
   ```bash
   cd server
   cp .env.example .env
   ```
2. Start Postgres via Docker Compose (runs on port 5432 by default):
   ```bash
   npm run db:up
   ```
3. Apply migrations + seed data:
   ```bash
   npm run db:init
   ```
4. Launch the app:
   ```bash
   npm run dev
   ```

Handy helpers:
```bash
npm run db:logs   # follow database logs
npm run db:down   # stop and remove the local database container
```

## 2. Hosted environments (Render example)

1. Create a Render PostgreSQL instance (Starter tier works for demos).
2. Copy its **Internal Database URL** and set it as `DATABASE_URL` on the web service (Settings ? Environment).
3. Add other runtime env vars (`NODE_ENV=production`, `JWT_SECRET`, etc.).
4. Configure the service **Pre-deploy command**:
   - **Staging**: `npm run db:init` (migrations + seed)
   - **Production**: `cd server && npx prisma migrate deploy`
   Seed production manually only when you intentionally reset the data.
5. Keep your normal start command (`npm run dev` for combined dev servers, or `cd server && npm run start` in production).

### Multi-tenant schemas on a single Postgres

- Create the extra schema once (example): `psql "$DATABASE_URL_MAIN" -c "CREATE SCHEMA IF NOT EXISTS adam;"`.
- Set `DATABASE_URL_MAIN=...schema=public` and `DATABASE_URL_ADAM=...schema=adam` on the backend service.
- Run `npm run db:init:tenants` (add `-- --with-seed` only if you want to seed each schema).
- The API selects the tenant per request via `x-tenant` header (`main` default, `adam` optional).

## 3. CI / preview deployments

- Reuse the same `npm run db:init` command in any pipeline stage that provisions a temporary database.
- Because the seed script relies on Prisma `upsert`s, it can be run safely multiple times.
- Failing migrations or seed steps should block the deployment long before traffic reaches the app.

## 4. Environment variables

| Variable            | Required | Description                                                   |
| ------------------- | -------- | ------------------------------------------------------------- |
| `DATABASE_URL`      | ?       | Full Postgres connection string (includes host/user/password) |
| `PORT`              | ?       | Express server port (defaults to 5000)                        |
| `NODE_ENV`          | ?       | `development`/`production`                                    |
| `JWT_SECRET`        | ?       | Secret used to sign session tokens                            |
| `POSTGRES_USER`     | optional | Overrides Docker Compose defaults                             |
| `POSTGRES_PASSWORD` | optional | Overrides Compose default password                            |
| `POSTGRES_DB`       | optional | Overrides Compose default DB name                             |

With these pieces in place, provisioning a fresh environment (local, staging, production, or preview) boils down to: provide a Postgres connection string and run `npm run db:init`.
