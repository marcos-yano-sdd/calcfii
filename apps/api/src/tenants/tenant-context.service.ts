import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';
import { AuthenticatedContext } from '../auth/authenticated-request';
import { Role } from '../auth/permissions';

@Injectable()
export class TenantContextService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async resolve(input: { clerkUserId: string; clerkOrgId: string; email?: string }): Promise<AuthenticatedContext> {
    const tenant = await this.pool.query<{ id: string }>(
      `insert into tenants (clerk_org_id, name, slug)
       values ($1, $2, $3)
       on conflict (clerk_org_id) do update set updated_at = now()
       returning id`,
      [input.clerkOrgId, input.clerkOrgId, input.clerkOrgId.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)],
    );
    const tenantId = tenant.rows[0]?.id;
    const membership = await this.pool.query<{ id: string; role: Role }>(
      `select id, role from memberships
       where tenant_id = $1 and clerk_user_id = $2 and status = 'active'`,
      [tenantId, input.clerkUserId],
    );
    const active = membership.rows[0];
    if (!tenantId || !active) throw new UnauthorizedException('No active tenant membership');
    return {
      clerkUserId: input.clerkUserId,
      clerkOrgId: input.clerkOrgId,
      email: input.email,
      tenantId,
      membershipId: active.id,
      role: active.role,
    };
  }
}
