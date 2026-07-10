# Secure SaaS

Aplicacao SaaS multi-tenant iniciada do zero com seguranca desde o primeiro commit.

## Stack

- Backend: Node.js, TypeScript, NestJS e Fastify
- Frontend: Angular
- Autenticacao: Clerk
- Banco: PostgreSQL
- Migrations: SQL versionado com `node-pg-migrate`

## Estrutura

```text
apps/
  api/   Backend NestJS
  web/   Frontend Angular
specs/
  001-secure-multitenant-saas/
    contracts/openapi.yaml
    data-model.md
    plan.md
    security.md
    spec.md
    tasks.md
```

## Setup Local

Na raiz do repositorio:

```powershell
npm install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
docker compose up -d
npm run db:migrate
npm run db:seed
```

Subir backend:

```powershell
npm run dev:api
```

Subir frontend em outro terminal:

```powershell
npm run dev:web
```

URLs locais:

- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- Frontend Angular: `http://localhost:4200`

## Login Real Com Clerk

Preencha `apps/api/.env`:

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

Preencha `apps/web/.env`:

```env
NG_APP_API_BASE_URL=http://localhost:3000
NG_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
```

O frontend gera `apps/web/src/assets/app-config.json` automaticamente antes de `npm run dev:web` ou build. Esse arquivo e os `.env` reais nao devem ser versionados.

No Clerk Dashboard, copie:

- Organization ID ativa, exemplo `org_...`
- User ID, exemplo `user_...`
- Email do usuario

Depois preencha em `apps/api/.env`:

```env
CLERK_DEV_ORG_ID=org_...
CLERK_DEV_USER_ID=user_...
CLERK_DEV_USER_EMAIL=voce@example.com
CLERK_DEV_USER_NAME=Seu Nome
CLERK_DEV_TENANT_NAME=Tenant Local
CLERK_DEV_TENANT_SLUG=tenant-local
CLERK_DEV_ROLE=owner
```

Vincule o usuario Clerk ao tenant local:

```powershell
npm run db:link-clerk-user
```

Importante: o usuario precisa estar em uma Organization ativa no Clerk para o token conter `org_id`. Sem `org_id`, a API rejeita a request por falta de tenant ativo.

## Scripts

```powershell
npm run dev:api
npm run dev:web
npm run build
npm run test
npm run db:migrate
npm run db:seed
npm run db:link-clerk-user
```

## Seguranca E Multi-Tenancy

- Todas as rotas `/v1/*` exigem token Clerk valido.
- O backend resolve tenant a partir da Organization ativa do Clerk.
- O usuario precisa ter membership local ativa no tenant.
- Repositories filtram por `tenant_id`.
- Tabelas tenant-scoped usam Row Level Security no PostgreSQL.
- Alteracoes sensiveis geram eventos em `audit_events`.
- Tokens, cookies e secrets nao devem ser logados.

## Observacoes Para Outro Dev

Depois do checkout, nao instale dependencias dentro de `apps/api` ou `apps/web` diretamente. Use sempre `npm install` na raiz do repositorio.

O `postinstall` remove uma duplicacao local de `rxjs` no workspace web para evitar conflito de tipos do Angular em Windows/npm workspaces.
