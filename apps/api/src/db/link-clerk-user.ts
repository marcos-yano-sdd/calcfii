import { Pool } from 'pg';

type RequiredEnv = 'DATABASE_URL' | 'CLERK_DEV_ORG_ID' | 'CLERK_DEV_USER_ID' | 'CLERK_DEV_USER_EMAIL';

function env(name: RequiredEnv): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const role = process.env.CLERK_DEV_ROLE ?? 'owner';
  if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
    throw new Error('CLERK_DEV_ROLE must be owner, admin, member, or viewer');
  }

  const pool = new Pool({ connectionString: env('DATABASE_URL') });
  const tenant = await pool.query<{ id: string }>(
    `insert into tenants (clerk_org_id, name, slug)
     values ($1, $2, $3)
     on conflict (clerk_org_id) do update
       set name = excluded.name,
           slug = excluded.slug,
           updated_at = now()
     returning id`,
    [
      env('CLERK_DEV_ORG_ID'),
      process.env.CLERK_DEV_TENANT_NAME ?? 'Local Dev Tenant',
      process.env.CLERK_DEV_TENANT_SLUG ?? 'local-dev-tenant',
    ],
  );

  await pool.query(
    `insert into memberships (tenant_id, clerk_user_id, email, display_name, role, status)
     values ($1, $2, $3, $4, $5, 'active')
     on conflict (tenant_id, clerk_user_id) do update
       set email = excluded.email,
           display_name = excluded.display_name,
           role = excluded.role,
           status = 'active',
           updated_at = now()`,
    [
      tenant.rows[0].id,
      env('CLERK_DEV_USER_ID'),
      env('CLERK_DEV_USER_EMAIL'),
      process.env.CLERK_DEV_USER_NAME ?? null,
      role,
    ],
  );

  await pool.end();
  console.log(`Linked Clerk user ${env('CLERK_DEV_USER_ID')} to tenant ${tenant.rows[0].id} as ${role}.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
