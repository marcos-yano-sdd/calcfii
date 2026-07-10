# Constitution — Secure Multi-Tenant SaaS

## Escopo do projeto

Este projeto é uma aplicação SaaS multi-tenant nova, iniciada do zero. Não deve herdar escopo, nomes, entidades ou decisões de projetos anteriores do usuário, a menos que seja explicitamente solicitado.

## Stack obrigatória

- Backend Node.js com TypeScript.
- Frontend Angular.
- Autenticação e gestão de identidade com Clerk.
- Banco de dados PostgreSQL.
- Arquitetura multi-tenant desde a primeira versão.

## Princípios obrigatórios de segurança

### 1. Security by design

Segurança não é etapa posterior. Cada feature deve definir:
- ativos protegidos;
- atores;
- permissões;
- fronteiras de confiança;
- riscos principais;
- critérios de teste de segurança.

### 2. Autenticação centralizada

O login, cadastro, recuperação de senha, MFA e sessão devem ser delegados ao Clerk sempre que possível.

O backend deve verificar tokens Clerk em todas as rotas protegidas. Nenhuma decisão de autenticação deve depender apenas do frontend.

### 3. Multi-tenancy explícito

Toda requisição de negócio deve carregar contexto de tenant resolvido no backend.

O tenant pode ser mapeado a partir de Clerk Organizations ou de uma tabela local vinculada ao `organization_id` do Clerk.

Nenhum endpoint deve aceitar `tenant_id` livre no body para decidir escopo de acesso. Quando houver `tenant_id` em path/query/body, ele deve ser validado contra o contexto autenticado.

### 4. Defesa em profundidade no banco

Toda tabela com dados de cliente deve conter `tenant_id NOT NULL`.

O PostgreSQL deve usar:
- foreign keys;
- índices por `tenant_id`;
- constraints de unicidade compostas com `tenant_id` quando aplicável;
- Row Level Security onde fizer sentido;
- usuário de aplicação sem permissões administrativas.

### 5. Autorização por papéis e permissões

Papéis iniciais:
- `owner`: administra tenant, membros, cobrança e configurações críticas;
- `admin`: administra dados e usuários operacionais;
- `member`: usa funcionalidades principais;
- `viewer`: somente leitura.

Permissões efetivas devem ser calculadas no backend.

### 6. Auditoria obrigatória

Ações sensíveis devem gerar evento de auditoria:
- login relevante / troca de organização quando recebido via webhook ou evento interno;
- criação, alteração e remoção de membros;
- alteração de papel;
- criação, alteração e exclusão de dados sensíveis;
- exportação de dados;
- falhas de autorização relevantes.

### 7. Dados sensíveis

Nunca registrar em logs:
- tokens;
- senhas;
- cookies de sessão;
- segredos de API;
- payloads completos com PII sem mascaramento.

### 8. Critérios de aceite de segurança

Nenhuma feature é aceita sem:
- teste de autenticação;
- teste de autorização;
- teste de isolamento entre tenants;
- validação de input;
- logs/auditoria para operações críticas.
