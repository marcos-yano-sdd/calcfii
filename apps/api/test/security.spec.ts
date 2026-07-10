import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/auth/permissions';
import { updateTenantSchema } from '../src/tenants/tenant.service';

describe('security policy helpers', () => {
  it('denies members from managing roles', () => {
    expect(hasPermission('member', 'member:manage')).toBe(false);
  });

  it('allows owners to manage roles and read audit', () => {
    expect(hasPermission('owner', 'member:manage')).toBe(true);
    expect(hasPermission('owner', 'audit:read')).toBe(true);
  });

  it('rejects extra tenant update fields', () => {
    expect(() => updateTenantSchema.parse({ name: 'Valid', status: 'suspended' })).toThrow();
  });
});
