import 'dotenv/config';
import { execSync } from 'child_process';

type TenantConfig = {
  name: string;
  url?: string;
};

const tenants: TenantConfig[] = [
  { name: 'main', url: process.env.DATABASE_URL_MAIN ?? process.env.DATABASE_URL },
  { name: 'adam', url: process.env.DATABASE_URL_ADAM },
].filter((tenant) => Boolean(tenant.url));

function extractSchema(url: string) {
  const match = url.match(/schema=([^&]+)/);
  return match?.[1];
}

function createSchemaIfMissing(schema: string, envUrl: string, label: string) {
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
  console.log(`Ensured schema for ${label}: ${schema}`);
}

const withSeed = process.argv.includes('--with-seed');

if (!tenants.length) {
  console.error('No tenant database URLs found. Set DATABASE_URL or DATABASE_URL_MAIN/DATABASE_URL_ADAM.');
  process.exit(1);
}

function run(cmd: string, envUrl: string, label: string) {
  execSync(cmd, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: envUrl,
    },
  });
  console.log(`Finished ${label}`);
}

for (const tenant of tenants) {
  if (!tenant.url) continue;

  const schema = extractSchema(tenant.url);
  if (schema) {
    console.log(`\n=== Ensuring schema exists for tenant: ${tenant.name} (${schema}) ===`);
    createSchemaIfMissing(schema, tenant.url, tenant.name);
  }

  console.log(`\n=== Migrating tenant: ${tenant.name} (${tenant.url}) ===`);
  run('npx prisma migrate deploy', tenant.url, `${tenant.name} migrate`);

  if (withSeed) {
    console.log(`\n--- Seeding tenant: ${tenant.name} ---`);
    run('npm run seed', tenant.url, `${tenant.name} seed`);
  }
}

console.log('\nAll tenant migrations complete.');
