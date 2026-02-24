import { PrismaClient } from '@prisma/client';

type TenantKey = 'main' | 'adam' | (string & {});

const mainUrl = process.env.DATABASE_URL_MAIN ?? process.env.DATABASE_URL;
const adamUrl = process.env.DATABASE_URL_ADAM;
const defaultTenant: TenantKey = 'main';

if (!mainUrl) {
  throw new Error('DATABASE_URL or DATABASE_URL_MAIN must be set');
}

// Reuse clients in dev to avoid exhausting DB connections.
const globalForPrisma = globalThis as unknown as {
  prismaTenants?: Record<TenantKey, PrismaClient>;
};

const prismaTenants =
  globalForPrisma.prismaTenants ??
  (() => {
    const clients: Record<TenantKey, PrismaClient> = {
      main: new PrismaClient({ datasources: { db: { url: mainUrl } } }),
    };

    if (adamUrl) {
      clients.adam = new PrismaClient({ datasources: { db: { url: adamUrl } } });
    }

    return clients;
  })();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaTenants = prismaTenants;
}

export function getPrismaClient(tenant?: TenantKey): PrismaClient {
  if (tenant && prismaTenants[tenant]) {
    return prismaTenants[tenant];
  }
  return prismaTenants[defaultTenant];
}

export function getTenantKeys() {
  return Object.keys(prismaTenants) as TenantKey[];
}

export const DEFAULT_TENANT = defaultTenant;
