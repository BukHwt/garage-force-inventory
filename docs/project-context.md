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
- Adam schema URL secret name: DATABASE_URL_ADAM
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
  - Selecting a location now hides products that do not have inventory at that location.
  - Transfer actions now only list products with on-hand inventory.
  - Reorder alerts default to a collapsed state on the dashboard.
  - Helper text about inline editing was removed from the inventory UI.
  - Client TypeScript config now includes `ignoreDeprecations: "6.0"` for current compiler compatibility.
- Active development device target:
  - Samsung Galaxy S25 Ultra
  - Browser: Chrome (Android)

## Collaboration Preferences

- User preference: Keep communication practical and upbeat in a "Janet-like" style from The Good Place (friendly, clear, capable).
- Guardrail: Keep scope tight; do not expand scope without explicit user approval.
- Handoff preference: End each handoff with a short request for feedback on tone/style so future sessions can tune communication.
- Latest tone feedback: Janet vibe rated "good" by user (2026-02-27).

## Development Workflow Preference
- Default workflow: test UI and small behavior changes directly in the browser first.
- Reserve a build for a "sticky problem" such as a suspected compile issue, a confusing runtime error, a deployment handoff, or a change that touches build-critical config.
- When there is no sticky problem, advise the user to test in the browser rather than running a build.
- Avoid doing a build after every small change unless it is needed for verification or handoff.

## Next Chat Handoff
- Date: 2026-07-02
- Active goal status: Completed (location-aware inventory workflow + Manage picker + Unseal workflow).
- Branch: `feature/dashboard-inline-inventory`
- Completed outcomes:
  1. Added reusable in-app `ProductPicker` to Manage forms (`Receive`, `Transfer`, `Use`).
  2. Search supports `name`, `sku`, and `vendorPartNumber` (case-insensitive).
  3. Category groups in picker start collapsed by default.
  4. Added lightweight recent-product memory in picker.
  5. Added dedicated `Unseal` mode in Manage (single-row mode selector).
  6. `Unseal` product selection is filtered to products with sealed inventory only.
  7. Manage mode persists (`/manage?mode=...`) so the form stays on the active tab after actions/refetch.
  8. Shared Orders add rows now show full product names (no truncation clipping).
  9. Transaction rollback now triggers inventory refetch so the dashboard reflects rolled-back quantities.
  10. Selecting a location now filters out products that do not have inventory there.
  11. Transfer actions only offer products that currently have on-hand inventory.
  12. Reorder alerts begin collapsed on the dashboard to keep the inventory list prominent.
  13. Helper text for inline editing was removed from the inventory UI.
- Validation completed:
  - [x] Browser-first verification for the latest inventory and Manage flow changes.
  - [x] `cd client && npx tsc --noEmit`
  - [x] `cd client && npm run build`
  - [x] `cd server && npx tsc --noEmit`
- Follow-up/manual QA checklist:
  1. Verify Manage tab behavior on Samsung S25 Ultra in Chrome for all 4 modes.
  2. Verify rollback flow updates Dashboard counts immediately for receipt/use/transfer/unseal cases.
  3. Confirm long product names remain readable in Shared Orders add rows without horizontal scroll.
  4. Spot-check location filtering and transfer availability on mobile before the next release.

## Security & Reliability Plan (Next Priority)

- Objective: harden app against abuse/tampering before expanded neighbor onboarding.
- Execution order:
  1. Tenant isolation hardening:
     - enforce tenant access from authenticated user context (JWT/session claims), not client header trust alone.
     - add tests proving cross-tenant denial for unauthorized users.
  2. Auth and mutation route protection:
     - add rate limiting for login and write-heavy endpoints.
     - add lockout/backoff for repeated failed PIN attempts.
  3. API security baseline:
     - add `helmet`, tighten CORS to known frontend origins, disable `x-powered-by`.
     - centralize request validation (reject unknown/malformed fields consistently).
  4. Dependency and secret posture:
     - remediate high/critical dependency vulnerabilities.
     - verify strong/rotatable `JWT_SECRET` handling.
  5. Deploy/ops reliability:
     - add CI gates for build/type/tests before merge/deploy.
     - define backup/restore drill and monitoring alerts.

## Testing Baseline Needed For Next Release

- Minimum automated gate:
  1. `client`: `npx tsc --noEmit` + `npm run build`
  2. `server`: `npx tsc --noEmit`
  3. integration tests:
     - role restrictions (`VIEWER` write block)
     - tenant isolation
     - inventory flows (`receive`, `transfer`, `use`, `unseal`, rollback)
     - auth throttling behavior
  4. mobile smoke E2E:
     - Manage flow
     - Shared Orders add/view
     - rollback reflected on Dashboard

## Neighborhood Collaboration Scope

- Current phase scope:
  - Read-only cross-tenant visibility of on-hand inventory.
  - Shared order list for combined purchasing (`OPEN`, `ORDERED`, `RECEIVED`, `CANCELLED`).
- Explicitly out of scope in current phase:
  - "Click product to request from neighbor" actions.
  - Shared draft request list, email generation, or text-message generation.
- Future candidate scope:
  - Tap neighbor item (e.g., top coat) to add to a request draft list that can be exported via email/text to Adam.
  - Include richer pricing support sourced from canonical CSV data where available; if price data is missing in snapshots/CSVs, research alternative source (including vendor website) and backfill.

## Shared Orders Pricing Notes

- Price support is deferred for now; no price input in current Shared Orders UI.
- Future plan:
  1. Load canonical prices from curated data source (CSV/snapshot/import), not manual row-by-row typing.
  2. Once trusted pricing exists, show running subtotal and progress toward the `$3,000` free-shipping threshold.

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
