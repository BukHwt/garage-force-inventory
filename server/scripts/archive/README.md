# Archived Scripts

These scripts were used during one-time catalog reconciliation and tenant sync work.

They are intentionally removed from normal `npm run` workflows. Keep them only for historical reference.

Current baseline workflow:
1. `npm run snapshot:all` to export tenant snapshots when needed.
2. Edit `prisma/data/seed.snapshot.main.json` / `seed.snapshot.adam.json` as the source of truth.
3. `npm run db:init` (or `npm run db:init:tenants:seed`) to rebuild from snapshots.
