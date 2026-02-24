# Garage Force Inventory Manager

Mobile-first inventory management system for SD Concrete Coating Inc / Garage Force franchise operations.

## Features

- **Multi-location inventory tracking** - Warehouse, Trailer, Personal
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
| Steve | OWNER  | 9143 |
| Alex  | TECH   | 7995 |
| Dan   | TECH   | 7770 |
| Adam  | VIEWER | 5185 |

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
- Seed data lives in `server/prisma/data/inventory.json` (generated from `inventory.csv`). Update those files and rerun `npm run seed` whenever your real-world inventory changes.

4. Start the development servers
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Multi-tenant (one Postgres, separate schemas)

- Model: one Postgres database (the binder) with per-tenant schemas (folders). Default tenant uses `public`, Adam uses `adam`.
- Env: set `DATABASE_URL_MAIN` (or `DATABASE_URL`) to `...schema=public` and `DATABASE_URL_ADAM` to `...schema=adam` on the backend.
- Create the extra schema once: `psql "$DATABASE_URL_MAIN" -c "CREATE SCHEMA IF NOT EXISTS adam;"`.
- Migrations: `npm run db:init:tenants` (runs `prisma migrate deploy` for each configured schema). Add `-- --with-seed` if you want to seed each schema; skip seeding to preserve existing data.
- Routing: the backend picks the schema per request via header `x-tenant: adam` (defaults to `main`). Use the same backend URL for all tenants.

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
- `npm run seed` - Seed database with sample data
- `npm run db:init` - Prisma migrate deploy + seed (used in CI/CD)
- `npx prisma studio` - Open Prisma Studio database viewer

> Need a deeper dive into environment setup or hosting? See `docs/deployment.md`.

## Transaction Log & Rollbacks

- Open the **More** tab in the bottom navigation and tap **Transaction Log** to review recent activity.
- Each entry shows product, locations, user, and whether the action is eligible for rollback.
- Rollbacks are disabled automatically when newer activity exists for the same product/location or when reversing the move would create negative inventory.
- Only non-viewer roles can trigger rollbacks, and every rollback captures who performed it for auditing.

## Database Schema

### Core Models

**Product** - Catalog of available products
- Name, SKU, description, category
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
