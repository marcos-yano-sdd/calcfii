# Research Notes — Feature 001

## Clerk

Clerk gera tokens de sessão como JWTs que devem ser validados no backend. A documentação indica que esses tokens podem chegar por cookie `__session` ou header `Authorization`, dependendo da arquitetura.

Clerk também oferece SDK/backend utilities para Express e verificação de token via `verifyToken()`. Para um backend Node.js, a implementação deve usar o SDK oficial compatível com o framework escolhido ou validação manual documentada.

JWT templates/custom claims podem ser usados quando for necessário incluir dados adicionais no token, mas a fonte final de autorização da aplicação deve continuar sendo o backend e o banco local.

## Angular

Clerk possui documentação/SDKs JavaScript, mas a disponibilidade e maturidade de suporte específico para Angular deve ser validada no momento da implementação. Se não houver SDK Angular oficial adequado ao caso, usar ClerkJS com wrapper Angular próprio é uma alternativa aceitável.

## PostgreSQL RLS

PostgreSQL oferece Row Level Security para restringir quais linhas podem ser acessadas por consultas. Para multi-tenancy, RLS é útil como camada de defesa adicional, mas não substitui autorização no backend.

## Decisão

- Usar Clerk para autenticação e identidade.
- Usar tabela local para tenants/memberships.
- Usar roles locais para autorização da aplicação.
- Usar RLS no PostgreSQL como defesa em profundidade.
- Não confiar no frontend para decisões finais de acesso.

## Links de referência

- Clerk session tokens: https://clerk.com/docs/guides/sessions/session-tokens
- Clerk manual JWT verification: https://clerk.com/docs/guides/sessions/manual-jwt-verification
- Clerk verifyToken: https://clerk.com/docs/reference/backend/verify-token
- Clerk Express SDK: https://clerk.com/docs/reference/express/overview
- Clerk JWT templates: https://clerk.com/docs/guides/sessions/jwt-templates
- PostgreSQL Row Security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
