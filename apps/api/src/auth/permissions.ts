export const roles = ['owner', 'admin', 'member', 'viewer'] as const;
export type Role = (typeof roles)[number];

export type Permission = 'tenant:read' | 'tenant:update' | 'member:read' | 'member:manage' | 'audit:read';

export const rolePermissions: Record<Role, Permission[]> = {
  owner: ['tenant:read', 'tenant:update', 'member:read', 'member:manage', 'audit:read'],
  admin: ['tenant:read', 'tenant:update', 'member:read', 'audit:read'],
  member: ['tenant:read', 'member:read'],
  viewer: ['tenant:read'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
