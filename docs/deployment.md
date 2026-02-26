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
4. Configure the service commands:
   - **Build**: `npm ci --include=dev && npm run build`
   - **Pre-deploy (production default)**: `npm run db:init:tenants` (migrations only)
   - **Start**: `npm run start`
   Use `npm run db:init:tenants:seed` only when you intentionally want a full data rebuild from snapshots.
5. Keep runtime env vars in Render aligned with your tenant setup (`DATABASE_URL` for `public`, `DATABASE_URL_ADAM` for `adam`).

### Multi-tenant schemas on a single Postgres

- Create the extra schema once (example): `psql "$DATABASE_URL_MAIN" -c "CREATE SCHEMA IF NOT EXISTS adam;"`.
- Set `DATABASE_URL_MAIN=...schema=public` and `DATABASE_URL_ADAM=...schema=adam` on the backend service.
- Run `npm run db:init:tenants` for migrations only.
- Run `npm run db:init:tenants:seed` only for intentional schema rebuilds from snapshot data.
- The API selects the tenant per request via `x-tenant` header (`main` default, `adam` optional).

## 3. CI / preview deployments

- Use `npm run db:init:tenants` in deployment pipelines where data must be preserved.
- Use `npm run db:init:tenants:seed` only in ephemeral/test environments where destructive reseeding is expected.
- Failing migrations or seed steps should block the deployment before traffic reaches the app.

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

With these pieces in place, provisioning is straightforward:
- Preserve data: provide tenant DB URLs and run `npm run db:init:tenants`.
- Rebuild from canonical snapshots: run `npm run db:init:tenants:seed`.
