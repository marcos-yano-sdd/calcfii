# Feature 001 — Secure Multi-Tenant SaaS Foundation

## Branch sugerida

`001-secure-multitenant-saas`

## Objetivo

Criar a base inicial de uma aplicação SaaS multi-tenant segura usando backend Node.js/TypeScript, frontend Angular, Clerk para login/organizações e PostgreSQL como banco relacional.

Esta feature deve entregar uma fundação funcional, segura e extensível, não uma feature de domínio específica.

## Problema

Aplicações SaaS multi-tenant tendem a acumular riscos quando autenticação, autorização e isolamento de dados são adicionados tardiamente. O objetivo é evitar isso definindo desde o início:

- autenticação robusta;
- tenant context obrigatório;
- autorização por papel;
- isolamento no banco;
- trilha de auditoria;
- padrões de validação;
- estrutura testável.

## Usuários

### Usuário autenticado
Pessoa que acessa a aplicação após login via Clerk.

### Owner do tenant
Usuário com permissão máxima dentro de uma organização/tenant.

### Admin do tenant
Usuário com permissão administrativa operacional, mas sem controle total de billing ou propriedade.

### Member
Usuário comum com acesso às funcionalidades principais.

### Viewer
Usuário com acesso somente leitura.

### Suporte interno futuro
Ator administrativo da plataforma. Não faz parte do MVP, mas o design não deve impedir suporte auditado no futuro.

## Requisitos funcionais

### RF01 — Autenticação com Clerk

A aplicação deve permitir login, logout e sessão persistente usando Clerk.

O frontend Angular deve integrar os componentes ou SDK Clerk disponíveis para autenticação.

O backend deve aceitar apenas requisições autenticadas para rotas protegidas e deve verificar o token de sessão Clerk.

### RF02 — Organizações e tenants

A aplicação deve tratar cada organização Clerk como um tenant lógico, ou mapear explicitamente `clerk_org_id` para uma tabela local `tenants`.

A primeira versão deve usar a tabela local `tenants` para manter dados próprios da aplicação sem acoplar todo o domínio diretamente ao provedor de identidade.

### RF03 — Provisionamento de tenant

Quando uma organização válida for detectada pela primeira vez, o backend deve criar ou sincronizar o registro local de tenant.

O registro deve conter:
- `id` UUID interno;
- `clerk_org_id` único;
- `name`;
- `slug`;
- status;
- timestamps.

### RF04 — Membership local

A aplicação deve manter tabela local de membros para autorização rápida e auditável.

Cada membro deve conter:
- tenant;
- usuário Clerk;
- email;
- nome opcional;
- papel;
- status;
- timestamps.

### RF05 — Contexto de tenant obrigatório

Toda rota de negócio deve exigir tenant ativo.

O backend deve resolver tenant a partir do token/sessão Clerk e/ou organização ativa. O frontend pode enviar um header como `X-Tenant-Id`, mas o backend deve validar que esse tenant pertence ao usuário autenticado.

### RF06 — Autorização por papel

O backend deve oferecer guard/middleware/decorator para declarar permissões por rota.

Exemplos:
- `tenant:read` para viewer ou superior;
- `tenant:update` para admin ou owner;
- `member:manage` para owner;
- `audit:read` para admin ou owner.

### RF07 — API inicial

A API deve expor endpoints mínimos:

- `GET /health` público, sem dados sensíveis;
- `GET /v1/me` retorna usuário autenticado, tenants disponíveis e tenant ativo;
- `GET /v1/tenants/current` retorna tenant atual;
- `PATCH /v1/tenants/current` atualiza nome/slug se permitido;
- `GET /v1/members` lista membros do tenant;
- `PATCH /v1/members/{memberId}/role` altera papel se permitido;
- `GET /v1/audit-events` lista eventos de auditoria do tenant.

### RF08 — Frontend Angular inicial

O frontend deve conter:
- layout público para login;
- layout autenticado;
- proteção de rotas;
- seleção/visualização do tenant ativo;
- página inicial autenticada;
- página de membros;
- página de auditoria;
- tratamento visual para 401, 403 e ausência de tenant.

### RF09 — Auditoria

A aplicação deve registrar eventos de auditoria para ações sensíveis.

Cada evento deve conter:
- tenant;
- ator;
- ação;
- entidade afetada;
- diffs mínimos quando apropriado;
- IP/user-agent quando disponível;
- timestamp.

### RF10 — Webhooks Clerk

A feature deve preparar endpoint para webhooks Clerk, com verificação de assinatura, para sincronizar organizações e memberships.

O endpoint pode inicialmente registrar eventos e executar upsert de tenants/membros.

### RF11 — Migrações

O projeto deve usar ferramenta de migration versionada, como Prisma Migrate, Drizzle Kit, Kysely migrations ou node-pg-migrate.

A escolha deve ser documentada em `plan.md`.

### RF12 — Observabilidade mínima

A aplicação deve gerar logs estruturados sem dados sensíveis.

Cada request deve ter correlation id.

Falhas de autenticação/autorização devem ser registradas sem vazar token ou payload sensível.

## Requisitos não funcionais

### Segurança

- Verificar token Clerk no backend.
- Validar input com schemas explícitos.
- Usar headers de segurança.
- Aplicar CORS restritivo por ambiente.
- Nunca expor stack trace ao cliente em produção.
- Nunca logar tokens ou cookies.
- Segredos apenas via variáveis de ambiente ou secret manager.

### Multi-tenancy

- Toda tabela tenant-scoped deve ter `tenant_id`.
- Todo índice de busca operacional deve considerar `tenant_id`.
- Toda consulta de negócio deve filtrar por tenant no repositório e, preferencialmente, também por RLS no banco.

### Performance inicial

- Índices obrigatórios para foreign keys e buscas por tenant.
- Paginação em listas.
- Select explícito de colunas.
- Sem N+1 em endpoints principais.

### Manutenibilidade

- TypeScript strict.
- ESLint/Prettier.
- Testes unitários e de integração.
- Separação clara entre controller, service, repository e policy.

## Fora do escopo

- Billing/pagamentos.
- Domínio de negócio específico.
- Aplicativo mobile.
- Painel administrativo interno da plataforma.
- SSO corporativo avançado.
- Integração com analytics externo.

## Critérios de aceite

1. Usuário consegue fazer login no frontend via Clerk.
2. Backend rejeita requisição sem token em rotas protegidas.
3. Backend rejeita token inválido/expirado.
4. Usuário só acessa dados do tenant do qual é membro.
5. Tentativa de acessar outro tenant retorna 403 ou 404 seguro.
6. Owner consegue listar membros.
7. Member não consegue alterar papel de outro membro.
8. Eventos sensíveis geram registro em `audit_events`.
9. Testes de isolamento multi-tenant existem e passam.
10. Migrações criam tabelas, constraints, índices e políticas RLS previstas.
