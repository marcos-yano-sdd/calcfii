import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';
import { withTenant } from '../db/tenant-query';
import { AuthenticatedContext } from '../auth/authenticated-request';

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !['authorization', 'cookie', 'token', 'secret', 'password'].includes(key.toLowerCase()),
    ),
  );
}

@Injectable()
export class AuditService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async recordAuditEvent(
    auth: AuthenticatedContext,
    action: string,
    entityType: string,
    entityId?: string,
    metadata: unknown = {},
  ) {
    await withTenant(this.pool, auth.tenantId, async (client) => {
      await client.query(
        `insert into audit_events
         (tenant_id, actor_clerk_user_id, actor_membership_id, action, entity_type, entity_id, metadata)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          auth.tenantId,
          auth.clerkUserId,
          auth.membershipId,
          action,
          entityType,
          entityId ?? null,
          JSON.stringify(sanitize(metadata)),
        ],
      );
    });
  }

  async list(auth: AuthenticatedContext, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    return withTenant(this.pool, auth.tenantId, async (client) => {
      const items = await client.query(
        `select id, tenant_id as "tenantId", actor_clerk_user_id as "actorClerkUserId",
                action, entity_type as "entityType", entity_id as "entityId", metadata, created_at as "createdAt"
         from audit_events
         where tenant_id = $1
         order by created_at desc
         limit $2 offset $3`,
        [auth.tenantId, safePageSize, (safePage - 1) * safePageSize],
      );
      const total = await client.query('select count(*)::int as total from audit_events where tenant_id = $1', [
        auth.tenantId,
      ]);
      return { items: items.rows, page: safePage, pageSize: safePageSize, total: total.rows[0].total };
    });
  }
}
