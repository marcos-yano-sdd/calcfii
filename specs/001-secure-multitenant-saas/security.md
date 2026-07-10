# Security Requirements — Feature 001

## Modelo de ameaça inicial

### Ativos protegidos

- Dados de cada tenant.
- Identidade dos usuários.
- Papéis e permissões.
- Eventos de auditoria.
- Tokens de sessão.
- Segredos de infraestrutura.

### Atores maliciosos considerados

- Usuário autenticado tentando acessar outro tenant.
- Usuário member tentando executar ação de admin/owner.
- Usuário externo com token inválido.
- Atacante tentando forjar webhook.
- Atacante tentando explorar input malicioso.
- Desenvolvedor acidentalmente criando query sem filtro de tenant.

## Controles obrigatórios

### Autenticação

- Todas as rotas `/v1/*`, exceto health público se definido, exigem token Clerk válido.
- Backend deve verificar assinatura, expiração e issuer/audience quando aplicável.
- Tokens nunca devem ser logados.

### Autorização

- Implementar guard de permissões.
- Implementar matriz de permissões central.
- Rejeitar por padrão quando permissão não estiver explicitamente configurada.

### Tenant isolation

- Backend deve resolver tenant por request.
- Repository deve receber `tenantId` obrigatório.
- Queries devem filtrar por `tenant_id`.
- RLS deve ser aplicada para tabelas tenant-scoped.

### Input validation

- Todo body/query/param deve ser validado.
- Campos inesperados devem ser rejeitados ou ignorados explicitamente.
- IDs devem ser UUID quando internos.
- Slugs devem ter formato restrito.

### Output safety

- Respostas não devem incluir dados internos como stack traces, secrets, raw tokens ou claims completas desnecessárias.
- Erros 403/404 devem evitar revelar existência de recurso de outro tenant.

### Logs

- Usar logs estruturados.
- Redigir headers sensíveis.
- Incluir correlation id.
- Nunca logar `Authorization`, cookies, tokens, secret keys ou payload completo de webhook sem mascaramento.

### Webhooks

- Verificar assinatura do webhook antes de processar.
- Garantir idempotência por event id.
- Registrar falhas com payload sanitizado.

### Banco

- Usuário da aplicação sem `BYPASSRLS`.
- Migrations executadas por usuário separado.
- Conexões em produção via TLS quando aplicável.
- Backups criptografados conforme ambiente.

## Testes de segurança obrigatórios

1. Request sem token retorna 401.
2. Token inválido retorna 401.
3. Usuário de tenant A não lê dados do tenant B.
4. Usuário viewer não altera tenant.
5. Usuário member não altera papel.
6. Owner altera papel e gera auditoria.
7. Webhook sem assinatura válida é rejeitado.
8. Body com campo extra sensível não altera dados não permitidos.
9. Query direta de lista retorna apenas dados do tenant ativo.
10. Logs de erro não contêm token.

## Checklist PR

- [ ] Esta mudança adiciona ou altera dados tenant-scoped?
- [ ] Todas as queries filtram por tenant?
- [ ] Há teste negativo de cross-tenant?
- [ ] Há teste de permissão insuficiente?
- [ ] Inputs foram validados?
- [ ] Outputs foram revisados para vazamento?
- [ ] Auditoria foi considerada?
- [ ] Logs não expõem dados sensíveis?
