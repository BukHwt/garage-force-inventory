# Inventory Data Roadmap

The current Prisma schema (`server/prisma/schema.prisma`) captures the core entities for Garage Force’s multi-location inventory. This document summarizes what we already track and outlines the next set of attributes/relationships to consider.

## 1. Current coverage

| Entity                | Key fields captured today                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Product`             | Name, SKU, description, color, unit size, manufacturer, category, supplier type, reorder thresholds, lead time, usage per job  |
| `InventoryItem`       | Product ↔ location link, quantity, status (sealed/open), batch number, expiration, notes                                       |
| `Location`            | Name, description                                                                                                              |
| `InventoryTransaction` | Product reference, transaction type (receipt/consumption/transfer/adjustment), source/destination locations, quantity, notes |
| `ProductComponent`    | Kit ↔ component relationships, quantity required, optional flag, labels, sort order                                           |

The seed script provisions Warehouse, Trailer, and Personal locations plus a representative catalog of coatings, kits, repair products, flakes, tools, and disposables.

## 2. Next iteration ideas

| Area                | Proposed additions                                                                                                   | Rationale |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- |
| Product master data | `costPerUnit`, `msrp`, `weight`, `hazmatClass`, `supplierId`, `safetySheetUrl`, `lifeCycleStage`, `discontinuedAt`   | Enables margin analysis, shipping planning, and regulatory compliance. |
| Supplier tracking   | New `Supplier` model (name, contact, lead times, preferred shipping method) and relationship from `Product`.         | Allows franchise owners to record local sources vs GF-mandated ones.   |
| Location metadata   | Fields for `type` (warehouse/trailer/personal), `capacityUnits`, GPS coordinates, `defaultForTransfers`.             | Improves routing and transfer UX.                                      |
| InventoryItem       | `binLocation`, `condition` (new/good/damaged), `lastCountedAt`, `cycleCountUserId`.                                   | Supports audits and physical counting workflows.                       |
| Transactions        | `jobId`/`jobReferenceId`, `unitCost`, `performedByUserId`, `attachments` (e.g., photos or PDFs).                     | Links consumption to jobs and simplifies reconciliation.                |
| Forecasting         | Historical usage rollups (daily/weekly) or a materialized view for quick reorder calculations.                       | Drives smarter replenishment alerts.                                   |

## 3. Recommended sequencing

1. **Schema groundwork** – add `Supplier` model + relationships, plus the lighter-weight column additions (`binLocation`, `condition`, `jobId`, etc.). Reflect changes in Prisma schema, migration file, and seed data.
2. **Seed/data sync** – update `prisma/seed.ts` to populate the new fields and provide at least one supplier + kit example using the richer metadata.
3. **API/UI surfacing** – expose new fields via REST routes, then surface them in the admin UI (filters, forms, detail pages).
4. **Reporting/automation** – once the data exists, create endpoints or cron jobs for reorder forecasts and job-costing exports.

This roadmap keeps changes incremental while steering toward a richer source of truth that can support both day-to-day job prep and higher-level franchise analytics. Additions can be pulled into focused tickets (e.g., “Add Supplier model and connect to Product”) for iterative delivery.
