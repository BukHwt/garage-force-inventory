# Garage Force Inventory Manager

Original project code is licensed under the ISC License; see `LICENSE`.
Third-party dependencies and branded assets retain their applicable rights and licenses.

See [ROADMAP.md](ROADMAP.md) for the planned bulk-receiving, neighbor transfer-request, and notification workflows.

Mobile-first inventory management system for concrete-coating materials, storage locations, and supplies shared between neighboring operators. Created and personally owned by Steve.

This review copy includes fictional users and inventory. Every demo user's PIN is **5555**. No operational database is included. The revised example configuration uses its own database, Docker volume, and local ports; do not copy environment files from a running installation into this folder.

## Features

- **Multi-location inventory tracking** - Warehouse, Trailer, Personal
- **Location management** - Create/edit locations, enforce unique naming, and delete only when inventory is zero
- **Neighbor inventory visibility** - Read-only cross-tenant view to see what nearby franchise inventory is on hand
- **Shared orders list** - Combined purchasing list with status tracking and running total toward free shipping
- **Smart reorder alerts** - Never run out of critical materials, with a compact collapsed view on the dashboard
- **Tracked-first dashboard behavior** - Selecting a location keeps tracked products visible even when that location is currently at zero
- **Cleaner transfer workflow** - Transfer only offers products that currently have inventory on hand
- **Chip blend unit handling** - Chip blends can show separate box and bucket counts, including merged dashboard rows and per-location summaries
- **Catalog unit-variant workflow** - Products tab can create a new unit size from an existing catalog item instead of retyping all shared fields
- **Supplier management** - Track Garage Force required/optional vs locally sourced items
- **Transaction history & rollback** - Full audit trail of receipts, consumption, transfers with rollback safeguards
- **Mobile-optimized UI** - Designed for Android Chrome for on-the-go inventory updates

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Testing**: Playwright (mobile-first E2E tests)

## Project Structure

```
garage-force-inventory/
├── client/          # React frontend
├── server/          # Express backend API
├── tests/           # Playwright E2E tests
└── package.json     # Root package with scripts
```

## Getting Started

### Branding
- Title: Garage Force Inventory
- Favicon: Garage Force PNG (32px/192px)

### Authentication
- The app now requires signing in with a PIN so every transaction is attributed to a teammate.
- Fictional demo users:

| Name  | Role   | PIN  |
| ----- | ------ | ---- |
| DemoOwner | OWNER  | 5555 |
| DemoTechnician  | TECH   | 5555 |
| DemoManager   | OWNER  | 5555 |
| DemoViewer  | VIEWER | 5555 |
| DemoNeighborOwner | OWNER | 5555 |
| DemoNeighborTechnician | TECH | 5555 |
| DemoNeighborManager | OWNER | 5555 |
| DemoNeighborViewer | VIEWER | 5555 |

The first four accounts belong to **Demo Franchise North**. The four DemoNeighbor accounts belong to **Demo Franchise South**. Each franchise has its own warehouse, trailer, and storage location, plus independent stock of twelve fictional catalog records. All accounts use PIN **5555**.

The demo deliberately includes different stock levels: North has no Sample Gray Blend boxes while South has eight, and South has no Sample Primer while North has ten. These are useful cases for designing transfer requests in both directions. A franchise is a separate inventory namespace; a warehouse or trailer is a storage location inside that franchise.

- Set `JWT_SECRET` in each environment. View-only users can browse data but cannot access the Manage tab.

### Prerequisites

- Node.js 22 (the project's Prisma version requires at least Node.js 18.18)
- npm
- Docker Desktop, running with Linux containers, for the isolated demo database

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd garage-force-inventory
```

2. Install all dependencies
```bash
npm run install-all
```

3. Set up and seed the database
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run db:up        # starts Postgres via Docker Compose
npm --prefix server run db:init:tenants:seed
```
On Windows PowerShell, use `Copy-Item server/.env.example server/.env` and `Copy-Item client/.env.example client/.env` for the two copy commands. Copy these examples only when creating a fresh demo configuration; do not overwrite an existing configuration you need to keep.

The initialization command applies migrations and replaces demo seed data in both configured schemas. Run it only against the disposable local demo database supplied here, never against an operational database.
- Seed data now lives in snapshot files:
  - `server/prisma/data/seed.snapshot.main.json` (public/main schema)
  - `server/prisma/data/seed.snapshot.adam.json` (adam schema)
  - `server/prisma/data/seed.snapshot.json` (fallback/default)
- Export fresh snapshots (without seeding) via:
  - `cd server && npm run snapshot:all`
  - This writes `*.candidate.json` files by default and will not overwrite existing files unless `--overwrite` is used.

4. Start the development servers
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3101
- Backend API: http://localhost:5101

The example PostgreSQL instance is bound to 127.0.0.1:55433 and uses the dedicated `inventory_public_demo` database. Its Compose project and volume are independent from existing installations. The example credentials and signing key are public demo values and must not be used for a live service. Complete the documented multi-tenant initialization to populate both public/main and adam demo schemas.

## Multi-tenant (one Postgres, separate schemas)

- Model: one Postgres database with separate franchise schemas. Demo Franchise North uses `public` (tenant key `main`); Demo Franchise South uses `adam`. The `adam` key is retained for compatibility and does not contain real user or inventory data.
- Env: set `DATABASE_URL_MAIN` (or `DATABASE_URL`) to `...schema=public` and `DATABASE_URL_ADAM` to `...schema=adam` on the backend.
- Create the extra schema once: `psql "$DATABASE_URL_MAIN" -c "CREATE SCHEMA IF NOT EXISTS adam;"`.
- Migrations only: `npm run db:init:tenants` (runs `prisma migrate deploy` for each configured schema).
- Migrate + seed both schemas from the project root: `npm --prefix server run db:init:tenants:seed`.
- Routing: the backend picks the schema per request via header `x-tenant: adam` (defaults to `main`). Use the same backend URL for all tenants.

## Snapshot Seed Workflow

Use this as the single repeatable data workflow:

Only fictional demo data should be committed to the public repository. Never replace these demo snapshots with exports from an operational database; candidate exports are ignored by Git for that reason.

1. Optionally export snapshots from your disposable demo database:
   - `cd server && npm run snapshot:all`
   - Default output files:
     - `server/prisma/data/seed.snapshot.main.candidate.json`
     - `server/prisma/data/seed.snapshot.adam.candidate.json`
   - Replace canonical files only intentionally:
     - `cd server && npm run snapshot:all:replace`
2. Apply housekeeping edits directly in:
   - `server/prisma/data/seed.snapshot.main.json`
   - `server/prisma/data/seed.snapshot.adam.json`
3. Rebuild from snapshots:
   - `npm run db:init` (single schema)
   - `npm run db:init:tenants:seed` (multi-tenant)

Legacy reconciliation scripts are archived in `server/scripts/archive`.

## Product Tracking Rules

- Products can be organized in collapsible category groups on both Dashboard and Products tabs (mobile-first scrolling behavior).
- Tracking is edited in the Product Edit modal.
- Products tab now includes a `Show Tracked Only` toggle in `View/Edit` mode for faster maintenance of tracked items.
- Untracking is blocked when:
  - inventory quantity exists for that product, or
  - reorder point is above `0`.
- Reorder behavior:
  - setting reorder point to a value above `0` automatically sets `isTracked = true`,
  - reorder point `0` (or cleared/null) does not force tracking.
- Dashboard behavior:
  - tracked products remain visible for a selected location even when quantity is `0`,
  - tracked chip blends can be restored from `0` without leaving the dashboard.
- The same API rules apply per tenant schema (`main`, `adam`) since both use the same backend route logic.

## Product Catalog Workflows

- `View/Edit` mode supports direct editing plus an `Add Unit` action on each product row.
- `Add / Add Unit` mode now supports two creation paths:
  - `Add Unit Size To Existing Product` pre-fills shared fields from a selected catalog item so the user only needs to set the new `SKU` and `unit size`.
  - `Add Brand-New Product` remains available for items that do not already exist in the catalog.
- This workflow is intended for cases like chip blends that need separate `box` and `bucket` variants without manually copying the product definition.

## Chip Blend Dashboard Behavior

- Chip blends with multiple unit variants can be merged into one dashboard row when they share the same blend name.
- The dashboard shows separate `boxes` and `buckets` counts instead of treating them as a single total.
- In `All Locations`, chip blend `By Location` summaries now show unit-aware counts such as `2 boxes / 3 buckets` rather than `open/sealed`.
- Unit controls only render for unit types that actually exist in the catalog for that blend.

## Available Scripts

### Root directory
- `npm run dev` - Start both client and server
- `npm run client` - Start frontend only
- `npm run server` - Start backend only
- `npm run db:up` - Start the local Postgres container
- `npm run db:down` - Stop/remove the local Postgres container
- `npm run db:logs` - Tail the Postgres logs
- `npm run db:init` - Apply migrations and seed data (delegates to `server/`)
- `npm test` - Run Playwright tests
- `npm run test:mobile` - Run mobile-specific tests
- `npm run install-all` - Install all dependencies

### Server directory
- `npm run dev` - Start server with hot reload
- `npm run seed` - Seed database from snapshot baseline
- `npm run db:init` - Prisma migrate deploy + seed (used in CI/CD)
- `npm run db:init:tenants` - Migrate each configured tenant schema
- `npm run db:init:tenants:seed` - Migrate + seed each configured tenant schema
- `npm run snapshot:main` - Export snapshot for `main` tenant
- `npm run snapshot:adam` - Export snapshot for `adam` tenant
- `npm run snapshot:all` - Export snapshots for all configured tenants
- `npm run snapshot:*:replace` - Intentionally overwrite canonical snapshot files
- `npx prisma studio` - Open Prisma Studio database viewer

> Need a deeper dive into environment setup or hosting? See `docs/deployment.md`.

## Transaction Log & Rollbacks

- Open the **More** tab in the bottom navigation and tap **Transaction Log** to review recent activity.
- Each entry shows product, locations, user, and whether the action is eligible for rollback.
- Rollbacks are disabled automatically when newer activity exists for the same product/location or when reversing the move would create negative inventory.
- Only non-viewer roles can trigger rollbacks, and every rollback captures who performed it for auditing.

## Location Management

- Open the **More** tab and tap **Manage Locations**.
- `OWNER` and `TECH` roles can create, edit, and delete locations.
- `VIEWER` role remains read-only.
- Location names are validated by the API:
  - Trimmed before save
  - Minimum 2 characters
  - Case-insensitive unique per tenant
  - Duplicate error copy: `Location names must be unique.`
- Delete is blocked when the location has inventory quantity above `0`.
- Location lists are sorted alphabetically.

## Neighbor Inventory

- Open the **More** tab and tap **Neighbor Inventory**.
- Choose the neighboring tenant and search by name/SKU/vendor part number.
- The screen is intentionally read-only in this phase.
- Transfer requests and in-app notifications are planned in `ROADMAP.md`; email and text delivery are possible later additions.

## Shared Orders

- Open the **More** tab and tap **Shared Orders**.
- Use `View/Edit` to manage status (`OPEN`, `ORDERED`, `RECEIVED`, `CANCELLED`) and `Add Item` to append new order requests.
- Add flow is quantity-first (no manual price entry in-row).
- Product/category text in add rows is fully readable (no name truncation in row content).
- Price data and `$3,000` free-shipping progress are planned for later once pricing sources are integrated.

## Manage Workflows

- Manage now includes four compact modes in one row: `Receive`, `Transfer`, `Unseal`, and `Use`.
- Product selection in Manage uses an in-app picker (search + collapsed category groups + recent products), replacing native device dropdowns.
- `Transfer` and `Use` default to in-stock product filtering in the picker.
- `Unseal` mode is dedicated to opening sealed containers and only lists products with sealed quantity available.
- Active Manage mode is persisted in the URL (`/manage?mode=...`) so the screen stays on the same mode after submit/refetch.

## Database Schema

### Core Models

**Product** - Catalog of available products
- Name, SKU, description, category
- Vendor part number (non-unique) for supplier codes that are reused across variants
- Reorder management (reorder point, max stock, lead time)
- Supplier type (Garage Force required/optional/open source)
- Consumable type (reusable vs single-use items)
- Average usage per job

**InventoryItem** - Actual stock at locations
- Links products to locations with quantities
- Batch tracking (batch number, expiration dates)

**Location** - Storage locations
- Warehouse (main storage)
- Trailer (mobile inventory for jobs)
- Personal (garage/truck overflow)

**InventoryTransaction** - Movement history
- Types: RECEIPT, CONSUMPTION, TRANSFER, ADJUSTMENT
- Full audit trail with job references

## Mobile-First Design

This app is optimized for use on Android phones via Chrome:
- Touch-friendly UI with large tap targets
- Mobile viewport (393x851 - Pixel 5)
- Quick actions for common tasks
- Responsive layout for portrait and landscape

## License

ISC

## Author

Steve — personal project owner and developer.
