create extension if not exists pgcrypto;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null unique,
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  clerk_user_id text not null,
  email text not null,
  display_name text,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, clerk_user_id)
);

create index idx_memberships_clerk_user_id on memberships(clerk_user_id);
create index idx_memberships_tenant_role on memberships(tenant_id, role);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_clerk_user_id text,
  actor_membership_id uuid references memberships(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_events_tenant_created_at on audit_events(tenant_id, created_at desc);
create index idx_audit_events_tenant_action_created_at on audit_events(tenant_id, action, created_at desc);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table tenants enable row level security;
alter table memberships enable row level security;
alter table audit_events enable row level security;

create policy tenant_isolation_tenants on tenants
  using (id::text = current_setting('app.current_tenant_id', true));

create policy tenant_isolation_memberships on memberships
  using (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy tenant_isolation_audit_events on audit_events
  using (tenant_id::text = current_setting('app.current_tenant_id', true));
