-- Negative isolation smoke test for local PostgreSQL.
begin;
select set_config('app.current_tenant_id', '00000000-0000-0000-0000-000000000001', true);
-- Queries must also filter by tenant_id in repositories; RLS is a defense-in-depth layer.
select * from memberships where tenant_id = '00000000-0000-0000-0000-000000000001';
rollback;
