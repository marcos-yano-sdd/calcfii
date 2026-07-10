import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const tenantA = await pool.query(
    `insert into tenants (clerk_org_id, name, slug)
     values ('org_dev_alpha', 'Alpha Tenant', 'alpha-tenant')
     on conflict (clerk_org_id) do update set name = excluded.name
     returning id`,
  );
  const tenantB = await pool.query(
    `insert into tenants (clerk_org_id, name, slug)
     values ('org_dev_beta', 'Beta Tenant', 'beta-tenant')
     on conflict (clerk_org_id) do update set name = excluded.name
     returning id`,
  );
  await pool.query(
    `insert into memberships (tenant_id, clerk_user_id, email, display_name, role)
     values
       ($1, 'user_dev_owner_alpha', 'owner.alpha@example.test', 'Owner Alpha', 'owner'),
       ($1, 'user_dev_member_alpha', 'member.alpha@example.test', 'Member Alpha', 'member'),
       ($2, 'user_dev_owner_beta', 'owner.beta@example.test', 'Owner Beta', 'owner')
     on conflict (tenant_id, clerk_user_id) do nothing`,
    [tenantA.rows[0].id, tenantB.rows[0].id],
  );
  await pool.end();
}

void main();
