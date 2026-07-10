# Data Model — Feature 001

## Entidades

### tenants

Representa o tenant interno da aplicação.

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| clerk_org_id | text | unique, not null |
| name | text | not null |
| slug | text | unique, not null |
| status | text | active, suspended, archived |
| created_at | timestamptz | not null |
| updated_at | timestamptz | not null |

Índices:
- unique `clerk_org_id`
- unique `slug`

### memberships

Relaciona usuário Clerk a tenant local.

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK tenants, not null |
| clerk_user_id | text | not null |
| email | text | not null |
| display_name | text | nullable |
| role | text | owner, admin, member, viewer |
| status | text | active, invited, disabled |
| created_at | timestamptz | not null |
| updated_at | timestamptz | not null |

Constraints:
- unique `(tenant_id, clerk_user_id)`
- check role in allowed values
- check status in allowed values

Índices:
- `(tenant_id, role)`
- `(clerk_user_id)`

### audit_events

Registra eventos de auditoria por tenant.

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK tenants, not null |
| actor_clerk_user_id | text | nullable para eventos de sistema |
| actor_membership_id | uuid | nullable |
| action | text | not null |
| entity_type | text | not null |
| entity_id | text | nullable |
| metadata | jsonb | default `{}` |
| ip_address | inet | nullable |
| user_agent | text | nullable |
| created_at | timestamptz | not null |

Índices:
- `(tenant_id, created_at desc)`
- `(tenant_id, action, created_at desc)`
- GIN em `metadata` apenas se necessário depois

### app_settings futura

Fora da feature 001, mas reservada para configurações por tenant.

## SQL inicial sugerido

```sql
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
```

## RLS sugerido

```sql
alter table tenants enable row level security;
alter table memberships enable row level security;
alter table audit_events enable row level security;

create policy tenant_isolation_memberships on memberships
  using (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy tenant_isolation_audit_events on audit_events
  using (tenant_id::text = current_setting('app.current_tenant_id', true));

create policy tenant_isolation_tenants on tenants
  using (id::text = current_setting('app.current_tenant_id', true));
```

## Observação importante sobre RLS

RLS deve ser configurado com cuidado para não ser contornado por usuários de banco com privilégios elevados. A aplicação deve usar um usuário de banco específico e sem privilégios administrativos.
