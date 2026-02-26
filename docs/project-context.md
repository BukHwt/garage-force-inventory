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

## Current State
- Production status: Live
- Canonical data model status:
  - Snapshot-driven seeding in place (`seed.snapshot.main.json`, `seed.snapshot.adam.json`).
  - Legacy reconciliation scripts archived under `server/scripts/archive`.
  - `vendorPartNumber` is available for shared supplier part numbers.
- UI behavior updates:
  - Single-use items do not show open/sealed status labels in product cards.
  - Category lists support `Hide All` / `Show All`.
- Active development device target:
  - Samsung Galaxy S25 Ultra
  - Browser: Chrome (Android)

## Next Chat Handoff
- Date: 2026-02-26
- Active goal: Build Shared Orders list (view/edit + add) as phase 2 of neighborhood collaboration.
- Branch: `feature/shared-orders-list`
- PR link(s): [set in next session]
- Product direction:
  1. Add a `Neighbor Inventory` entry under the `More` tab.
  2. Allow viewing on-hand inventory from the opposite tenant.
  3. Keep behavior read-only for this phase (all roles can view).
  4. Keep behavior tenant-aware (`main` and `adam` can differ).
- Current tenant context:
  - `main` currently has: `Personal`, `Trailer`, `Warehouse`.
  - `adam` canonical default locations: `Personal`, `Trailer`, `Farm`.
- Suggested acceptance criteria:
  1. From `More`, user can navigate to a locations screen.
  2. User can add a location and it appears immediately in location pickers/filters.
  3. User can edit location name/description and updates persist.
  4. Changes apply only to the active tenant.
  5. Viewer-role users cannot modify locations.
- Commands already run this session:
  1. Local migration + seed validation across tenants.
  2. Production deploy completed and verified live.
- Validation completed:
  - [x] `client` TypeScript check
  - [x] `server` TypeScript check
  - [x] local seed/migrate run
  - [x] production deploy verified
- Known risks or follow-ups:
  1. Add dedicated automated tests for neighbor inventory endpoint + UI behavior.
  2. Confirm search/sort defaults for larger datasets once usage grows.

## Neighborhood Collaboration Scope
- Current phase scope:
  - Read-only cross-tenant visibility of on-hand inventory.
  - Shared order list for combined purchasing (`OPEN`, `ORDERED`, `RECEIVED`, `CANCELLED`).
- Explicitly out of scope in current phase:
  - "Click product to request from neighbor" actions.
  - Shared draft request list, email generation, or text-message generation.
- Future candidate scope:
  - Tap neighbor item (e.g., top coat) to add to a request draft list that can be exported via email/text to DemoViewer.
  - Include richer pricing support sourced from canonical CSV data where available; if price data is missing in snapshots/CSVs, research alternative source (including vendor website) and backfill.

## Shared Orders Pricing Notes
- Include per-item price on shared order items and show running order total.
- UI direction: do not require users to type price during add flow; add flow should be quantity-first.
- Operational target: free shipping threshold at `$3,000` for combined orders.
- Data source preference:
  1. Existing shared CSV inputs/snapshots if price is present.
  2. If missing, perform manual research or website-sourced enrichment workflow.

## Location Feature Decisions
- Delete behavior:
  - Location delete is allowed only when the location has no inventory.
  - Otherwise block delete with a clear error.
- Name uniqueness:
  - Location names must be unique per tenant.
  - Show user-facing error: `Location names must be unique.`
- Validation rules:
  - Trim whitespace.
  - Disallow blank names.
  - Minimum 2 characters.
  - Block duplicates case-insensitively.
- Authorization:
  - `OWNER` and `TECH` can create/edit/delete (when allowed).
  - `VIEWER` is read-only.
- Navigation:
  - Add `Manage Locations` entry under the `More` tab, routed to `/locations`.
- Ordering:
  - Sort locations alphabetically.

## Session Start Checklist
1. Confirm current branch and `git status`.
2. Confirm target environment (`local` vs `production`) before running DB commands.
3. Confirm tenant impact (`main`, `adam`, or both`) before any seed run.
4. Confirm whether changes should be canonical (snapshot edits) or one-off.

## Guardrails
- Never run snapshot export against local DB when canonical prod snapshots must be preserved.
- Prefer `snapshot:all` (candidate output) over `snapshot:*:replace` unless explicitly replacing canonical files.
- Treat `db:init:tenants:seed` as destructive and intentional.
- Keep production pre-deploy on migrate-only (`db:init:tenants`) unless a controlled rebuild is planned.
