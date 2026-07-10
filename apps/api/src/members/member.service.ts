import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { z } from 'zod';
import { PG_POOL } from '../db/db.module';
import { withTenant } from '../db/tenant-query';
import { AuthenticatedContext } from '../auth/authenticated-request';
import { AuditService } from '../audit/audit.service';

const roleSchema = z.object({ role: z.enum(['owner', 'admin', 'member', 'viewer']) }).strict();

@Injectable()
export class MemberService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthenticatedContext, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    return withTenant(this.pool, auth.tenantId, async (client) => {
      const items = await client.query(
        `select id, tenant_id as "tenantId", clerk_user_id as "clerkUserId", email,
                display_name as "displayName", role, status
         from memberships
         where tenant_id = $1
         order by created_at asc
         limit $2 offset $3`,
        [auth.tenantId, safePageSize, (safePage - 1) * safePageSize],
      );
      const total = await client.query('select count(*)::int as total from memberships where tenant_id = $1', [
        auth.tenantId,
      ]);
      return { items: items.rows, page: safePage, pageSize: safePageSize, total: total.rows[0].total };
    });
  }

  async updateRole(auth: AuthenticatedContext, memberId: string, body: unknown) {
    const input = roleSchema.parse(body);
    const updated = await withTenant(this.pool, auth.tenantId, async (client) => {
      const before = await client.query('select role from memberships where tenant_id = $1 and id = $2', [
        auth.tenantId,
        memberId,
      ]);
      if (!before.rows[0]) throw new NotFoundException('Member not found');
      const result = await client.query(
        `update memberships set role = $3, updated_at = now()
         where tenant_id = $1 and id = $2
         returning id, tenant_id as "tenantId", clerk_user_id as "clerkUserId", email,
                   display_name as "displayName", role, status`,
        [auth.tenantId, memberId, input.role],
      );
      return { before: before.rows[0], member: result.rows[0] };
    });
    await this.audit.recordAuditEvent(auth, 'member.role_updated', 'membership', memberId, {
      before: updated.before,
      after: { role: input.role },
    });
    return updated.member;
  }
}
