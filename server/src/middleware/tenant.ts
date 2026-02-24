import { NextFunction, Request, Response } from 'express';
import { DEFAULT_TENANT, getPrismaClient, getTenantKeys } from '../lib/prismaTenants.js';

const ALLOWED_TENANTS = new Set(getTenantKeys());

function resolveTenant(req: Request) {
  const header = (req.headers['x-tenant'] as string | undefined)?.toLowerCase().trim();
  if (header && ALLOWED_TENANTS.has(header)) {
    return header;
  }
  return DEFAULT_TENANT;
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = resolveTenant(req);
    req.tenant = tenant;
    req.prisma = getPrismaClient(tenant);
    next();
  } catch (err) {
    console.error('Tenant resolution failed:', err);
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
}
