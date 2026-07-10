# Tasks — Feature 001

## 1. Bootstrap do repositório

- [ ] Criar monorepo `secure-saas`.
- [ ] Criar `apps/api` com Node.js + TypeScript.
- [ ] Criar `apps/web` com Angular.
- [ ] Ativar TypeScript strict.
- [ ] Configurar ESLint/Prettier.
- [ ] Configurar scripts `dev`, `build`, `test`, `lint`.
- [ ] Criar Docker Compose com PostgreSQL.
- [ ] Criar `.env.example` para backend e frontend.

## 2. Banco de dados

- [ ] Escolher ferramenta de migration.
- [ ] Criar migration para `tenants`.
- [ ] Criar migration para `memberships`.
- [ ] Criar migration para `audit_events`.
- [ ] Criar índices obrigatórios.
- [ ] Criar policies RLS.
- [ ] Criar seed dev com dois tenants e usuários fictícios, sem dados reais.

## 3. Backend — autenticação

- [ ] Instalar SDK Clerk backend adequado.
- [ ] Criar `AuthModule`.
- [ ] Criar guard/middleware que verifica token Clerk.
- [ ] Criar tipo `AuthenticatedRequestContext`.
- [ ] Proteger `/v1/me`.
- [ ] Testar 401 para ausência de token.
- [ ] Testar 401 para token inválido.

## 4. Backend — tenant context

- [ ] Criar `TenantModule`.
- [ ] Implementar resolução de tenant por organização Clerk.
- [ ] Criar upsert local de tenant.
- [ ] Criar validação de membership ativa.
- [ ] Anexar `tenantId`, `membershipId`, `role` ao request context.
- [ ] Aplicar `SET LOCAL app.current_tenant_id` por transação/request.

## 5. Backend — autorização

- [ ] Criar enum de papéis.
- [ ] Criar matriz de permissões.
- [ ] Criar decorator `RequirePermission` ou equivalente.
- [ ] Criar guard de permissão.
- [ ] Aplicar guard em tenants/members/audit.
- [ ] Testar 403 para permissão insuficiente.

## 6. Backend — endpoints

- [ ] `GET /health`.
- [ ] `GET /v1/me`.
- [ ] `GET /v1/tenants/current`.
- [ ] `PATCH /v1/tenants/current`.
- [ ] `GET /v1/members`.
- [ ] `PATCH /v1/members/{memberId}/role`.
- [ ] `GET /v1/audit-events`.
- [ ] Paginação em listas.
- [ ] Validação de input.

## 7. Backend — auditoria

- [ ] Criar `AuditModule`.
- [ ] Criar service central `recordAuditEvent`.
- [ ] Registrar alteração de tenant.
- [ ] Registrar alteração de papel.
- [ ] Registrar falhas relevantes de autorização.
- [ ] Garantir sanitização de metadata.

## 8. Backend — webhooks Clerk

- [ ] Criar endpoint `/webhooks/clerk`.
- [ ] Verificar assinatura.
- [ ] Implementar idempotência mínima.
- [ ] Sincronizar organização criada/atualizada.
- [ ] Sincronizar membership criada/atualizada/removida.
- [ ] Testar webhook inválido.

## 9. Frontend Angular

- [ ] Configurar Clerk publishable key.
- [ ] Criar tela/rota pública de login.
- [ ] Criar auth guard para rotas privadas.
- [ ] Criar interceptor para enviar token ao backend.
- [ ] Criar API client tipado.
- [ ] Criar layout autenticado.
- [ ] Criar página Dashboard.
- [ ] Criar página Membros.
- [ ] Criar página Auditoria.
- [ ] Criar estados visuais para loading, 401, 403 e sem tenant.

## 10. Segurança e qualidade

- [ ] Configurar CORS restritivo.
- [ ] Configurar security headers.
- [ ] Configurar rate limit básico em rotas sensíveis.
- [ ] Configurar redaction de logs.
- [ ] Criar testes cross-tenant.
- [ ] Criar testes de autorização por papel.
- [ ] Criar testes de RLS/repository.
- [ ] Criar documentação de setup local.

## Definition of Done

- [ ] Feature roda localmente com Docker Compose.
- [ ] Login Clerk funciona no frontend.
- [ ] Backend valida token Clerk.
- [ ] Tenant context é obrigatório nas rotas protegidas.
- [ ] Isolamento cross-tenant testado.
- [ ] Migrations e RLS versionadas.
- [ ] Auditoria funcional para ações sensíveis.
- [ ] OpenAPI atualizado.
- [ ] README/quickstart atualizado.
