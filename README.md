# Garage Force Inventory Manager

Mobile-first inventory management system for SD Concrete Coating Inc / Garage Force franchise operations.

## Features

- **Multi-location inventory tracking** - Warehouse, Trailer, Personal
- **Smart reorder alerts** - Never run out of critical materials
- **Supplier management** - Track Garage Force required/optional vs locally sourced items
- **Transaction history** - Full audit trail of receipts, consumption, and transfers
- **Mobile-optimized UI** - Designed for Android Chrome for on-the-go inventory updates

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with Prisma ORM
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

3. Set up the database
```bash
cd server
cp .env.example .env
npx prisma migrate deploy
npm run seed
cd ..
```

4. Start the development servers
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Available Scripts

### Root directory
- `npm run dev` - Start both client and server
- `npm run client` - Start frontend only
- `npm run server` - Start backend only
- `npm test` - Run Playwright tests
- `npm run test:mobile` - Run mobile-specific tests
- `npm run install-all` - Install all dependencies

### Server directory
- `npm run dev` - Start server with hot reload
- `npm run seed` - Seed database with sample data
- `npx prisma studio` - Open Prisma Studio database viewer

## Database Schema

### Core Models

**Product** - Catalog of available products
- Name, SKU, description, category
- Reorder management (reorder point, max stock, lead time)
- Supplier type (Garage Force required/optional/open source)
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
