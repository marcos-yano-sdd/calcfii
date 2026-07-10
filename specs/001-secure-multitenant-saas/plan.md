# Implementation Plan — Feature 001

## Decisões recomendadas

### Backend

Recomendação: NestJS com Fastify adapter.

Motivo:
- estrutura opinativa ajuda a manter segurança e modularidade;
- guards/decorators facilitam autenticação e autorização;
- validação por DTO/schema fica padronizada;
- bom encaixe para aplicações SaaS corporativas.

Alternativa aceitável: Fastify puro com TypeBox/Zod.

### Banco e migrations

Recomendação: Prisma para schema/migrations ou Drizzle para SQL mais explícito.

Escolha preferida para este projeto: Drizzle ORM + migrations SQL explícitas.

Motivo:
- bom controle de SQL;
- facilita revisar políticas RLS;
- evita abstração excessiva em decisões críticas de multi-tenancy.

### Validação

Backend:
- Zod para schemas de input/output ou class-validator se NestJS puro.

Frontend:
- Reactive Forms com validação local apenas para UX.

### Autenticação Clerk

- Angular usa Clerk para login/sessão.
- Backend valida token Clerk em middleware/guard.
- Backend resolve usuário por `clerk_user_id`.
- Tenant preferencialmente mapeado por `clerk_org_id` para `tenants.id`.

### Tenant context

A resolução de tenant deve seguir esta ordem:

1. Extrair identidade autenticada do token Clerk.
2. Extrair organização ativa do token, claim customizada ou header controlado pelo frontend.
3. Validar se a organização/tenant existe localmente.
4. Validar se o usuário é membro ativo do tenant.
5. Anexar ao request context: `auth.userId`, `auth.tenantId`, `auth.role`, `auth.permissions`.

### Row Level Security

Usar RLS como camada adicional, não como única proteção.

Padrão recomendado:

- Ao abrir transação/request, executar `SET LOCAL app.current_tenant_id = '<uuid>'`.
- Políticas RLS comparam `tenant_id::text = current_setting('app.current_tenant_id', true)`.
- Queries do repositório também filtram por `tenant_id` explicitamente.

### Estrutura de pastas sugerida

```text
apps/
  api/
    src/
      main.ts
      app.module.ts
      auth/
      tenants/
      members/
      audit/
      common/
        guards/
        decorators/
        errors/
        logging/
        validation/
      db/
        migrations/
        schema/
  web/
    src/app/
      core/
        auth/
        api/
        guards/
        interceptors/
      layouts/
      pages/
        dashboard/
        members/
        audit/
      shared/
packages/
  config/
  types/
```

## Fases de implementação

### Fase 1 — Bootstrap

- Criar monorepo.
- Configurar Node.js/TypeScript strict.
- Criar app backend.
- Criar app Angular.
- Configurar lint/test/build.
- Configurar Docker Compose com PostgreSQL.

### Fase 2 — Autenticação

- Configurar Clerk no Angular.
- Criar rotas públicas e protegidas.
- Criar middleware/guard Clerk no backend.
- Implementar `/v1/me`.

### Fase 3 — Modelo multi-tenant

- Criar tabelas `tenants`, `memberships`, `audit_events`.
- Criar constraints e índices.
- Criar policies RLS.
- Criar TenantContext.

### Fase 4 — Autorização

- Criar enum de papéis.
- Criar matriz de permissões.
- Criar decorator/guard de permissão.
- Proteger endpoints.

### Fase 5 — UI inicial

- Layout autenticado.
- Tenant ativo.
- Página dashboard.
- Página membros.
- Página auditoria.

### Fase 6 — Segurança e testes

- Testes unitários para policies.
- Testes integração para isolamento entre tenants.
- Testes para 401/403.
- Testes para auditoria.
- Hardening de headers/CORS/logs.

## Variáveis de ambiente

### Backend

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://app_user:app_password@localhost:5432/secure_saas
CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...
CLERK_JWT_KEY=...
CLERK_WEBHOOK_SECRET=...
APP_ALLOWED_ORIGINS=http://localhost:4200
```

### Frontend

```env
NG_APP_API_BASE_URL=http://localhost:3000
NG_APP_CLERK_PUBLISHABLE_KEY=...
```

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Vazamento entre tenants | Filtro obrigatório por tenant + RLS + testes de integração |
| Token aceito sem validação correta | Guard backend com verificação Clerk e testes de token inválido |
| Papel alterado indevidamente | Permission guard + auditoria + testes negativos |
| Logs vazando dados sensíveis | Redaction centralizada e testes/snapshot de logs |
| Webhook falso | Verificação de assinatura antes de processar payload |
| Dependência excessiva do frontend | Backend como fonte final de autenticação/autorização |
