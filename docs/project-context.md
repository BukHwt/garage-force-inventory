# Project Context

## System Overview
- Project: Garage Force Inventory
- Repository root: `c:\Users\swand\garage-force-inventory`
- Frontend app path: `client/`
- Backend app path: `server/`
- Database: PostgreSQL with Prisma
- Tenant model: one DB, separate schemas (`public` = main, `adam` = adam)

## Hosted Environments

### Frontend
- Platform: Vercel
- URL: https://garage-force-inventory-prod.vercel.app/
- Branch/deploy trigger: [fill in]

### Backend API
- Platform: Render
- Service name: garage-force-inventory-prod
- URL: https://garage-force-inventory-prod.onrender.com
- Health endpoint: [fill in]
- Branch/deploy trigger: [fill in]

### Database
- Platform: Render PostgreSQL
- Instance name: garage-force-database-prod
- Main schema URL secret name: DATABASE_URL
- DemoViewer schema URL secret name: DATABASE_URL_ADAM
- Notes:
  - Use external URL for local snapshot export.
  - Internal/private host is not reachable from local machine.

## Runtime Env Vars

### Backend required
- `DATABASE_URL` -> `...schema=public`
- `DATABASE_URL_ADAM` -> `...schema=adam`
- `JWT_SECRET`
- `NODE_ENV`
- `PORT`

### Local notes
- Local `.env` is at `server/.env`.
- Prefer temporary shell env when pointing local tools at production URLs.

## Data Workflow (Canonical)

### Current canonical source of seed data
- `server/prisma/data/seed.snapshot.main.json`
- `server/prisma/data/seed.snapshot.adam.json`
- Optional fallback: `server/prisma/data/seed.snapshot.json`

### Snapshot export commands
- `cd server && npm run snapshot:main`
- `cd server && npm run snapshot:adam`
- `cd server && npm run snapshot:all`
- These commands export to `*.candidate.json` by default and refuse overwrites unless `--overwrite` is passed.
- Canonical overwrite commands:
  - `cd server && npm run snapshot:main:replace`
  - `cd server && npm run snapshot:adam:replace`
  - `cd server && npm run snapshot:all:replace`

### Seed commands
- Single schema: `cd server && npm run db:init`
- Multi-tenant schemas: `cd server && npm run db:init:tenants:seed`

### Safety rules
- `npm run seed` is destructive for seed-managed tables (rebuild behavior).
- Production default is migrate-only; run seed in prod only when intentionally rebuilding.
- Do not rerun snapshot export against local DB when you intend to preserve prod-captured snapshots.
- Keep canonical snapshots protected by default. Use explicit `*:replace` commands only when intentionally replacing canonical files.

## Deploy Runbook

### Normal production deploy (no data reset)
1. Deploy backend code.
2. Run `prisma migrate deploy`.
3. Do not run seed.

### Intentional production rebuild from snapshots
1. Confirm snapshot files in repo are correct.
2. Deploy backend code.
3. Run `prisma migrate deploy`.
4. Run seed for intended schema(s).
5. Verify counts and key catalog categories.

## Known Decisions
- `Product.sku` remains unique and is treated as internal unique code.
- `Product.vendorPartNumber` is non-unique and stores supplier codes that may repeat across variants.
- Case products and individual products are separate catalog rows (e.g., buckets, rollers).

## Open TODOs
- [ ] Fill branch/deploy trigger details for Vercel and Render.
- [ ] Add explicit rollback procedure for failed prod deploy.
- [ ] Add verification checklist (category/product counts) after rebuild.

## Render Service Commands
- Build command: `npm ci --include=dev && npm run build`
- Pre-deploy command: `npm run db:init:tenants`
- Start command: `npm run start`
- Expected behavior: production does not seed automatically outside explicit pre-deploy commands.
