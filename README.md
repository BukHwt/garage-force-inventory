# Garage Force Inventory Manager

Mobile-first inventory management system for SD Concrete Coating Inc / Garage Force franchise operations.

## Features

- **Multi-location inventory tracking** - Warehouse, Trailer, Personal
- **Location management** - Create/edit locations, enforce unique naming, and delete only when inventory is zero
- **Smart reorder alerts** - Never run out of critical materials
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
- Default users (seeded locally and on staging):

| Name  | Role   | PIN  |
| ----- | ------ | ---- |
| DemoOwner | OWNER  | 5555 |
| DemoTechnician  | TECH   | 5555 |
| DemoManager   | TECH   | 5555 |
| DemoViewer  | VIEWER | 5555 |

- Set `JWT_SECRET` in each environment. View-only users can browse data but cannot access the Manage tab.

### Prerequisites

- Node.js 16+
- npm

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
npm run db:up        # starts Postgres via Docker Compose
npm run db:init      # runs migrations + seed script
```
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
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Multi-tenant (one Postgres, separate schemas)

- Model: one Postgres database (the binder) with per-tenant schemas (folders). Default tenant uses `public`, DemoViewer uses `adam`.
- Env: set `DATABASE_URL_MAIN` (or `DATABASE_URL`) to `...schema=public` and `DATABASE_URL_ADAM` to `...schema=adam` on the backend.
- Create the extra schema once: `psql "$DATABASE_URL_MAIN" -c "CREATE SCHEMA IF NOT EXISTS adam;"`.
- Migrations only: `npm run db:init:tenants` (runs `prisma migrate deploy` for each configured schema).
- Migrate + seed both schemas: `npm run db:init:tenants:seed`.
- Routing: the backend picks the schema per request via header `x-tenant: adam` (defaults to `main`). Use the same backend URL for all tenants.

## Snapshot Seed Workflow

Use this as the single repeatable data workflow:

1. Export snapshots from the live source of truth:
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
- Untracking is blocked when:
  - inventory quantity exists for that product, or
  - reorder point is above `0`.
- Reorder behavior:
  - setting reorder point to a value above `0` automatically sets `isTracked = true`,
  - reorder point `0` (or cleared/null) does not force tracking.
- The same API rules apply per tenant schema (`main`, `adam`) since both use the same backend route logic.

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

SD Concrete Coating Inc
