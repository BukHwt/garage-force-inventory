import 'dotenv/config';
import { execSync } from 'child_process';

type TenantConfig = {
  name: string;
  url: string;
};

const withSeed = process.argv.includes('--with-seed');

function resolveTenants(): TenantConfig[] {
  const mainUrl = process.env.DATABASE_URL_MAIN ?? process.env.DATABASE_URL;
  const adamUrl = process.env.DATABASE_URL_ADAM;

  const tenants: TenantConfig[] = [];
  if (mainUrl) tenants.push({ name: 'main', url: mainUrl });
  if (adamUrl) tenants.push({ name: 'adam', url: adamUrl });
  return tenants;
}

function extractSchema(url: string): string | undefined {
  const match = url.match(/schema=([^&]+)/);
  return match?.[1];
}

function runCommand(command: string, envUrl: string, label: string) {
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: envUrl,
    },
  });
  console.log(`Finished ${label}`);
}

function createSchemaIfMissing(schema: string, envUrl: string, tenantName: string) {
  // Use stdin because Prisma 6 does not support --script.
  const sql = `CREATE SCHEMA IF NOT EXISTS "${schema}";\n`;
  execSync(`npx prisma db execute --stdin --url "${envUrl}"`, {
    stdio: ['pipe', 'inherit', 'inherit'],
    env: {
      ...process.env,
      DATABASE_URL: envUrl,
    },
    input: sql,
    shell: true,
  } as any);
  console.log(`Ensured schema for ${tenantName}: ${schema}`);
}

function migrateTenant(tenant: TenantConfig) {
  const schema = extractSchema(tenant.url);
  if (schema) {
    console.log(`\n=== Ensuring schema exists for tenant: ${tenant.name} (${schema}) ===`);
    createSchemaIfMissing(schema, tenant.url, tenant.name);
  }

  console.log(`\n=== Migrating tenant: ${tenant.name} (${tenant.url}) ===`);
  runCommand('npx prisma migrate deploy', tenant.url, `${tenant.name} migrate`);
}

function seedTenant(tenant: TenantConfig) {
  console.log(`\n--- Seeding tenant: ${tenant.name} ---`);
  runCommand('npm run seed', tenant.url, `${tenant.name} seed`);
}

function main() {
  const tenants = resolveTenants();
  if (!tenants.length) {
    console.error('No tenant database URLs found. Set DATABASE_URL or DATABASE_URL_MAIN/DATABASE_URL_ADAM.');
    process.exit(1);
  }

  for (const tenant of tenants) {
    migrateTenant(tenant);
    if (withSeed) {
      seedTenant(tenant);
    }
  }

  console.log('\nAll tenant migrations complete.');
}

main();
