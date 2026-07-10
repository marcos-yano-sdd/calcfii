import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { z } from 'zod';
import { PG_POOL } from '../db/db.module';
import { withTenant } from '../db/tenant-query';
import { AuthenticatedContext } from '../auth/authenticated-request';
import { AuditService } from '../audit/audit.service';

export const updateTenantSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    slug: z.string().regex(/^[a-z0-9-]{3,60}$/).optional(),
  })
  .strict();

@Injectable()
export class TenantService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async current(auth: AuthenticatedContext) {
    return withTenant(this.pool, auth.tenantId, async (client) => {
      const result = await client.query('select id, name, slug, status from tenants where id = $1', [auth.tenantId]);
      return result.rows[0];
    });
  }

  async listForUser(clerkUserId: string) {
    const result = await this.pool.query(
      `select t.id, t.name, t.slug, t.status
       from tenants t
       join memberships m on m.tenant_id = t.id
       where m.clerk_user_id = $1 and m.status = 'active'
       order by t.name asc`,
      [clerkUserId],
    );
    return result.rows;
  }

  async updateCurrent(auth: AuthenticatedContext, body: unknown) {
    const input = updateTenantSchema.parse(body);
    const existing = await this.current(auth);
    const updated = await withTenant(this.pool, auth.tenantId, async (client) => {
      const result = await client.query(
        `update tenants
         set name = coalesce($2, name), slug = coalesce($3, slug), updated_at = now()
         where id = $1
         returning id, name, slug, status`,
        [auth.tenantId, input.name ?? null, input.slug ?? null],
      );
      return result.rows[0];
    });
    await this.audit.recordAuditEvent(auth, 'tenant.updated', 'tenant', auth.tenantId, {
      before: existing,
      after: updated,
    });
    return updated;
  }
}
