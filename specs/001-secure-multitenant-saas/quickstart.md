# Quickstart — Desenvolvimento local

## Pré-requisitos

- Node.js LTS.
- pnpm ou npm.
- Docker e Docker Compose.
- Conta Clerk configurada.
- PostgreSQL via Docker Compose.

## 1. Criar aplicação Clerk

No dashboard Clerk:

1. Criar aplicação.
2. Habilitar métodos de login desejados.
3. Habilitar Organizations.
4. Copiar publishable key e secret key.
5. Configurar URLs locais do frontend.
6. Criar webhook para eventos de organização/membership quando o endpoint local estiver disponível.

## 2. Configurar ambiente

Backend `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://app_user:app_password@localhost:5432/secure_saas
CLERK_SECRET_KEY=replace_me
CLERK_PUBLISHABLE_KEY=replace_me
CLERK_JWT_KEY=replace_me
CLERK_WEBHOOK_SECRET=replace_me
APP_ALLOWED_ORIGINS=http://localhost:4200
```

Frontend `.env` ou environment Angular:

```env
NG_APP_API_BASE_URL=http://localhost:3000
NG_APP_CLERK_PUBLISHABLE_KEY=replace_me
```

## 3. Subir infraestrutura

```bash
docker compose up -d postgres
```

## 4. Rodar migrations

```bash
pnpm db:migrate
```

## 5. Rodar backend

```bash
pnpm --filter api dev
```

## 6. Rodar frontend

```bash
pnpm --filter web start
```

## 7. Validar fluxo mínimo

1. Abrir `http://localhost:4200`.
2. Fazer login via Clerk.
3. Selecionar/criar organização.
4. Acessar dashboard.
5. Ver `/v1/me` retornando usuário e tenant.
6. Confirmar que endpoints protegidos rejeitam requests sem token.

## Comandos desejados

```bash
pnpm lint
pnpm test
pnpm test:integration
pnpm build
pnpm db:migrate
pnpm db:studio
```
