# Feature Specification — Atualização diária da taxa IMA-B 5

**Feature ID:** `002-ima-b5-daily-rate`  
**Status:** Draft  
**Tipo:** Backend / Integração / Job agendado  
**Prioridade:** Alta

## 1. Objetivo

Implementar um processo automatizado que, diariamente no horário configurado, com padrão **22:00**, no fuso horário `America/Sao_Paulo`:

1. baixe o arquivo Excel oficial de histórico/resultados do **IMA-B 5** disponibilizado pela ANBIMA;
2. identifique o registro mais recente válido;
3. obtenha a taxa correspondente à coluna **“Variação 12 meses (%)”**;
4. normalize o valor para formato numérico;
5. grave o valor no campo `taxa_ima_b` da tabela global `config` no PostgreSQL;
6. apague o arquivo baixado ao final do processamento, independentemente de sucesso ou falha.

A tabela `config` não é multi-tenant e deve conter somente a chave primária e o campo da taxa.

---

## 2. Contexto funcional

A taxa utilizada pela aplicação é a rentabilidade acumulada do índice **IMA-B 5 nos últimos 12 meses**, divulgada pela ANBIMA no campo “Variação 12 meses (%)”.

Exemplo:

- valor no Excel: `12,8000`;
- valor persistido: `12.8000`;
- significado: `12,80%` nos últimos 12 meses.

O valor deve ser armazenado em unidade percentual, e não em forma decimal. Portanto:

- correto: `12.8000`;
- incorreto: `0.128000`.

A fonte oficial é a página de resultados diários do IMA-B 5 da ANBIMA, que disponibiliza um arquivo de histórico em XLS:

`https://data.anbima.com.br/indices/consulta/ima/resultados-diarios/ima-b-5`

O endereço direto do arquivo não deve ser presumido como permanente. A integração deve permitir configurar a URL de download por variável de ambiente.

---

## 3. Escopo

### 3.1 Incluído

- migration para criação da tabela `config`;
- criação inicial do registro global `id = 1`;
- serviço para download do arquivo Excel;
- armazenamento temporário do arquivo;
- leitura de arquivos `.xls` e `.xlsx`;
- localização resiliente da coluna “Variação 12 meses (%)”;
- seleção do registro mais recente válido;
- conversão de número no padrão brasileiro;
- validação do valor;
- atualização transacional da tabela `config`;
- job agendado diariamente no horário configurado, com padrão 22:00;
- prevenção de execuções concorrentes;
- tentativas adicionais quando o dado ou arquivo ainda não estiver disponível;
- remoção obrigatória do arquivo temporário;
- logs estruturados;
- testes unitários e de integração.

### 3.2 Fora do escopo

- API paga ANBIMA Feed;
- armazenamento do histórico diário da taxa;
- tabela multi-tenant;
- interface administrativa;
- edição manual da taxa;
- cálculo de yield, taxa real ou “IPCA + X%”;
- persistência do arquivo Excel;
- armazenamento de outras métricas do IMA-B 5.

---

## 4. Requisitos funcionais

### RF-001 — Criar tabela global de configuração

Criar a tabela PostgreSQL:

```sql
CREATE TABLE config (
    id INTEGER PRIMARY KEY,
    taxa_ima_b NUMERIC(9,4)
);
```

Criar o registro global inicial:

```sql
INSERT INTO config (id, taxa_ima_b)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
```

Regras:

- a tabela não deve possuir `tenant_id`;
- deve existir somente um registro operacional, identificado por `id = 1`;
- o campo `taxa_ima_b` deve aceitar `NULL` até a primeira importação bem-sucedida;
- não adicionar colunas fora do escopo desta feature.

### RF-002 — Configurar a origem do arquivo

A URL de download deve ser configurável:

```env
ANBIMA_IMA_B5_XLS_URL=
```

A aplicação deve falhar na inicialização do módulo ou registrar erro explícito quando a variável não estiver configurada em ambiente no qual o job esteja habilitado.

Também deve existir:

```env
ANBIMA_IMA_B5_JOB_ENABLED=true
ANBIMA_IMA_B5_JOB_TIME=22:00
ANBIMA_IMA_B5_JOB_TIMEZONE=America/Sao_Paulo
ANBIMA_IMA_B5_TEMP_DIR=/tmp/anbima
```

Valores padrão permitidos:

- `ANBIMA_IMA_B5_JOB_ENABLED`: `true`;
- `ANBIMA_IMA_B5_JOB_TIME`: `22:00`;
- `ANBIMA_IMA_B5_JOB_TIMEZONE`: `America/Sao_Paulo`;
- `ANBIMA_IMA_B5_TEMP_DIR`: diretório temporário do sistema operacional.

### RF-003 — Executar diariamente

Executar o job todos os dias no horário configurado em `ANBIMA_IMA_B5_JOB_TIME`, com padrão **22:00**, usando o fuso horário `America/Sao_Paulo`.

`ANBIMA_IMA_B5_JOB_TIME` deve usar formato `HH:mm`. Expressão cron de referência para o padrão `22:00`:

```text
0 0 22 * * *
```

O agendador deve declarar explicitamente o fuso horário. Não depender do timezone padrão do servidor ou do container.

O job também pode ser acionado por um método interno para testes e operação manual, sem criar endpoint HTTP público nesta feature.

### RF-004 — Impedir concorrência

Não permitir duas execuções simultâneas do job.

Usar PostgreSQL advisory lock ou mecanismo equivalente compartilhado entre instâncias da aplicação.

Comportamento esperado:

- a primeira instância obtém o lock e executa;
- as demais encerram a execução sem erro;
- o lock deve ser liberado ao final, inclusive após exceção.

### RF-005 — Baixar o arquivo com segurança

O download deve:

- usar HTTPS;
- possuir timeout configurável, com padrão de 30 segundos;
- seguir redirecionamentos HTTPS;
- limitar o tamanho máximo do arquivo, com padrão de 20 MB;
- rejeitar resposta HTTP fora da faixa 200–299;
- rejeitar corpo vazio;
- aceitar `.xls` e `.xlsx`;
- validar o conteúdo como planilha, não apenas pela extensão ou `Content-Type`;
- gerar nome temporário único;
- não reutilizar arquivo de execução anterior.

Não registrar o conteúdo binário do arquivo nos logs.

### RF-006 — Ler a planilha

O parser deve procurar, de forma tolerante a pequenas diferenças de apresentação, as colunas equivalentes a:

- data de referência;
- índice ou nome do índice, quando presente;
- “Variação 12 meses (%)”.

A normalização do cabeçalho deve:

- remover espaços extras;
- ignorar maiúsculas e minúsculas;
- ignorar acentos;
- normalizar quebras de linha;
- aceitar variações como:
  - `Variação 12 meses (%)`;
  - `Variacao 12 meses (%)`;
  - `Variação 12 Meses`;
  - `12 meses (%)`.

O parser não deve depender de número fixo de linha, posição fixa da coluna ou nome fixo da aba.

### RF-007 — Identificar o IMA-B 5

Quando a planilha possuir mais de um índice, selecionar somente o registro cujo nome normalizado seja exatamente equivalente a `IMA-B 5`.

Não aceitar como correspondência:

- `IMA-B`;
- `IMA-B 5+`;
- `IMA-B 5 P2`;
- qualquer outro índice semelhante.

Quando o arquivo for exclusivo do IMA-B 5 e não possuir coluna de identificação, o parser pode considerar os registros da planilha como pertencentes ao IMA-B 5.

### RF-008 — Selecionar o registro mais recente

Entre os registros válidos, selecionar aquele com a maior data de referência.

A data deve ser lida como data de calendário, aceitando:

- célula de data nativa do Excel;
- `dd/MM/yyyy`;
- `yyyy-MM-dd`;
- outros formatos somente quando interpretados sem ambiguidade.

Ignorar linhas:

- vazias;
- sem data válida;
- com célula vazia, nula ou sem valor válido na coluna de 12 meses;
- de índices diferentes do IMA-B 5.

Uma linha com coluna de taxa vazia ou inválida deve ser descartada, não deve interromper o parsing do arquivo inteiro.

Se não houver registro válido após descartar linhas inválidas, o job deve falhar sem alterar o valor existente no banco.

### RF-009 — Obter e normalizar a taxa

A taxa oficial desta feature é o valor divulgado na coluna **“Variação 12 meses (%)”** do registro mais recente.

A conversão deve aceitar:

- número nativo do Excel: `12.8`;
- texto brasileiro: `12,8000`;
- texto com símbolo: `12,8000%`;
- texto internacional: `12.8000`.

Resultado normalizado:

```text
12.8000
```

Não dividir o valor por 100.

Antes da persistência:

- remover espaços;
- remover `%`;
- tratar separadores decimal e de milhar;
- converter para decimal exato;
- arredondar para quatro casas decimais usando regra definida pelo projeto;
- rejeitar `NaN`, infinito e texto não numérico.

Valores vazios, nulos ou não numéricos em linhas individuais devem tornar a linha inválida e ignorada na seleção do registro mais recente. A falha de domínio deve ocorrer apenas se nenhuma linha válida puder ser selecionada.

### RF-010 — Validar a taxa

A taxa deve respeitar uma faixa defensiva configurável.

Padrão:

```text
-100.0000 <= taxa_ima_b <= 500.0000
```

Um valor fora da faixa deve:

- ser rejeitado;
- gerar log de erro;
- não sobrescrever o valor anterior;
- não impedir a exclusão do arquivo temporário.

A faixa é uma proteção contra erro de parsing, não uma previsão financeira.

### RF-011 — Persistir de forma atômica

Após download, parsing e validação, atualizar:

```sql
UPDATE config
SET taxa_ima_b = :taxa
WHERE id = 1;
```

Caso o registro `id = 1` não exista, realizar upsert:

```sql
INSERT INTO config (id, taxa_ima_b)
VALUES (1, :taxa)
ON CONFLICT (id)
DO UPDATE SET taxa_ima_b = EXCLUDED.taxa_ima_b;
```

A escrita deve ocorrer em transação.

Nenhuma alteração deve ser feita no banco antes de o arquivo ter sido completamente validado.

### RF-012 — Apagar sempre o arquivo

O arquivo temporário deve ser removido em bloco equivalente a `finally`.

A remoção deve ocorrer após:

- sucesso;
- falha no parsing;
- planilha sem dados;
- taxa inválida;
- falha no banco;
- exceção inesperada.

Fluxo obrigatório:

```text
adquirir lock
  tentar
    baixar arquivo
    validar arquivo
    ler planilha
    selecionar registro
    normalizar taxa
    validar taxa
    persistir taxa
  finalmente
    apagar arquivo, se criado
    liberar lock
```

Uma falha ao apagar o arquivo deve:

- ser registrada como erro;
- não transformar uma importação já persistida em rollback;
- permitir mecanismo de limpeza de arquivos órfãos em inicialização ou próxima execução.

### RF-013 — Tratar indisponibilidade no horário agendado

Como a divulgação pode ainda não estar disponível exatamente no horário agendado, a mesma execução deve realizar até três tentativas adicionais quando ocorrer erro transitório.

Política padrão:

- tentativa inicial: horário configurado, padrão 22:00;
- segunda tentativa: após 10 minutos;
- terceira tentativa: após mais 20 minutos;
- quarta e última tentativa: após mais 30 minutos.

Aplicar retry somente a erros transitórios, tais como:

- timeout;
- HTTP 429;
- HTTP 5xx;
- arquivo ainda indisponível;
- arquivo válido sem registro referente ao último dia útil esperado.

Não repetir automaticamente para:

- formato incompatível;
- cabeçalho não reconhecido;
- taxa fora da faixa;
- erro permanente de configuração.

O retry não deve deixar arquivos temporários entre tentativas.

### RF-014 — Preservar último valor válido

Em qualquer falha:

- manter o valor anterior de `config.taxa_ima_b`;
- não gravar `NULL`;
- não gravar zero como fallback;
- não usar dado inventado ou cache externo;
- registrar a causa da falha.

### RF-015 — Logs estruturados

Registrar, sem dados binários:

- início e fim da execução;
- identificador da execução;
- tentativa atual;
- URL base ou identificador da fonte, sem credenciais;
- status HTTP;
- tamanho do arquivo;
- hash SHA-256 opcional do arquivo;
- data de referência selecionada;
- valor normalizado;
- resultado da persistência;
- exclusão do arquivo;
- motivo de falha;
- duração total.

Não registrar cookies, tokens ou headers sensíveis.

---

## 5. Requisitos não funcionais

### RNF-001 — Segurança

- aceitar somente origem HTTPS;
- não executar macros da planilha;
- não interpretar fórmulas externas;
- não seguir links contidos no Excel;
- limitar tamanho e tempo de download;
- armazenar arquivo em diretório temporário não público;
- usar permissões mínimas no arquivo;
- impedir path traversal;
- usar consultas parametrizadas no PostgreSQL.

### RNF-002 — Precisão

Usar tipo decimal, não ponto flutuante, na camada de domínio e persistência.

Persistir com quatro casas decimais em `NUMERIC(9,4)`.

### RNF-003 — Idempotência

Executar o job mais de uma vez para o mesmo arquivo ou data deve produzir o mesmo valor final.

### RNF-004 — Observabilidade

Falhas devem ser detectáveis nos logs e, quando houver infraestrutura de métricas, expor:

- contador de execuções;
- contador de sucessos;
- contador de falhas;
- duração;
- timestamp da última execução bem-sucedida.

Não adicionar colunas à tabela `config` para observabilidade.

### RNF-005 — Portabilidade

O job deve funcionar em ambiente local, container e produção, sem depender de caminho fixo ou timezone do host.

---

## 6. Modelo de dados

### Tabela `config`

| Coluna | Tipo | Nulo | Regra |
|---|---|---:|---|
| `id` | `INTEGER` | não | chave primária; registro operacional `id = 1` |
| `taxa_ima_b` | `NUMERIC(9,4)` | sim | variação percentual acumulada em 12 meses |

Migration de referência:

```sql
CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY,
    taxa_ima_b NUMERIC(9,4)
);

INSERT INTO config (id, taxa_ima_b)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
```

---

## 7. Arquitetura sugerida

Exemplo para backend NestJS:

```text
src/
  modules/
    config/
      config.module.ts
      config.repository.ts
      entities/config.entity.ts
    market-indices/
      market-indices.module.ts
      anbima/
        anbima-ima-b5.client.ts
        anbima-ima-b5.parser.ts
        anbima-ima-b5.service.ts
        anbima-ima-b5.scheduler.ts
        anbima-ima-b5.types.ts
        anbima-ima-b5.errors.ts
```

Responsabilidades:

- `client`: download e validação básica do arquivo;
- `parser`: leitura da planilha e extração do registro;
- `service`: orquestração, validação e persistência;
- `scheduler`: cron, timezone, retry e lock;
- `repository`: upsert de `config.id = 1`.

A biblioteca de planilhas deve suportar `.xls` e `.xlsx` sem executar macros.

---

## 8. Fluxo principal

```text
1. Scheduler dispara no horário configurado, padrão 22:00, em America/Sao_Paulo.
2. Job tenta adquirir advisory lock.
3. Se não obtiver lock, encerra como execução ignorada.
4. Cria identificador de execução.
5. Baixa o arquivo em caminho temporário único.
6. Valida tamanho e estrutura de planilha.
7. Localiza aba, cabeçalhos e linhas de dados.
8. Filtra somente IMA-B 5, quando necessário.
9. Seleciona a maior data de referência válida.
10. Extrai “Variação 12 meses (%)”.
11. Converte o valor para decimal com quatro casas.
12. Valida a faixa defensiva.
13. Executa upsert de config.id = 1 em transação.
14. Registra sucesso.
15. Remove o arquivo temporário em finally.
16. Libera o lock.
```

---

## 9. Tratamento de erros

Criar categorias de erro:

- `AnbimaDownloadError`;
- `AnbimaHttpError`;
- `AnbimaFileTooLargeError`;
- `AnbimaInvalidSpreadsheetError`;
- `AnbimaHeaderNotFoundError`;
- `AnbimaNoValidRecordError`;
- `AnbimaInvalidRateError`;
- `AnbimaPersistenceError`;
- `AnbimaCleanupError`.

Erros transitórios devem ser distinguíveis dos permanentes para aplicação da política de retry.

---

## 10. Critérios de aceitação

### CA-001 — Migration

**Dado** que a migration é executada  
**Quando** o banco é atualizado  
**Então** deve existir a tabela `config` somente com `id` e `taxa_ima_b`  
**E** deve existir o registro `id = 1`.

### CA-002 — Horário e timezone

**Dado** que o job está habilitado  
**Quando** for o horário configurado, padrão 22:00, em `America/Sao_Paulo`  
**Então** deve ser iniciada uma execução independentemente do timezone do servidor.

### CA-003 — Valor brasileiro

**Dado** um arquivo com `Variação 12 meses (%) = 12,8000`  
**Quando** o job processar o arquivo  
**Então** `config.taxa_ima_b` deve ser `12.8000`.

### CA-004 — Número nativo

**Dado** uma célula numérica Excel com valor `12.8`  
**Quando** o job processar o arquivo  
**Então** deve persistir `12.8000`.

### CA-005 — Índice correto

**Dado** um arquivo contendo IMA-B, IMA-B 5 e IMA-B 5+  
**Quando** o parser selecionar o índice  
**Então** deve usar somente o registro de IMA-B 5.

### CA-006 — Registro mais recente

**Dado** um histórico com várias datas  
**Quando** houver mais de um registro válido  
**Então** deve ser usada a maior data de referência.

### CA-007 — Falha de parsing

**Dado** um arquivo sem a coluna de variação em 12 meses  
**Quando** o parser falhar  
**Então** o valor existente no banco deve permanecer inalterado  
**E** o arquivo temporário deve ser apagado.

### CA-008 — Falha no banco

**Dado** um arquivo válido  
**E** uma indisponibilidade do PostgreSQL  
**Quando** a persistência falhar  
**Então** o arquivo temporário deve ser apagado  
**E** a falha deve ser registrada.

### CA-009 — Limpeza após sucesso

**Dado** um processamento bem-sucedido  
**Quando** a execução terminar  
**Então** não deve existir o arquivo baixado no diretório temporário.

### CA-010 — Limpeza após exceção

**Dado** qualquer exceção após a criação do arquivo  
**Quando** a execução terminar  
**Então** o sistema deve tentar apagar o arquivo em `finally`.

### CA-011 — Concorrência

**Dado** duas instâncias iniciando o job simultaneamente  
**Quando** ambas tentarem executar  
**Então** somente uma deve processar e persistir.

### CA-012 — Valor inválido

**Dado** um valor não numérico ou fora da faixa permitida  
**Quando** o job validar a taxa  
**Então** deve rejeitar o valor  
**E** preservar a taxa anteriormente gravada.

### CA-013 — Idempotência

**Dado** o mesmo arquivo processado duas vezes  
**Quando** ambas as execuções forem concluídas  
**Então** o estado final da tabela deve ser o mesmo.

---

## 11. Cenários de teste obrigatórios

### Testes unitários do parser

- cabeçalho exato;
- cabeçalho sem acento;
- cabeçalho com quebra de linha;
- ordem diferente de colunas;
- aba com nome inesperado;
- linhas introdutórias antes do cabeçalho;
- célula numérica;
- decimal com vírgula;
- decimal com ponto;
- valor com `%`;
- linha vazia;
- célula vazia na coluna de taxa sendo ignorada;
- data nativa do Excel;
- data `dd/MM/yyyy`;
- múltiplos índices;
- distinção entre IMA-B 5 e IMA-B 5+;
- seleção da data mais recente;
- ausência de registro válido.

### Testes do serviço

- persistência bem-sucedida;
- upsert quando `id = 1` não existe;
- preservação do valor anterior após erro;
- rejeição de valor fora da faixa;
- arquivo removido após sucesso;
- arquivo removido após erro do parser;
- arquivo removido após erro do banco;
- erro de remoção registrado.

### Testes do scheduler

- horário configurável por `ANBIMA_IMA_B5_JOB_TIME`;
- expressão cron derivada do horário configurado;
- timezone explícito;
- job desabilitado por configuração;
- lock adquirido;
- lock não adquirido;
- retry de erro transitório;
- ausência de retry em erro permanente.

### Teste de integração

Usar uma fixture local representativa do arquivo da ANBIMA, sem depender da internet no pipeline de CI.

O teste deve comprovar:

```sql
SELECT id, taxa_ima_b FROM config WHERE id = 1;
```

Resultado esperado para fixture com `12,8000`:

```text
id = 1
taxa_ima_b = 12.8000
```

E confirmar que o diretório temporário não contém o arquivo ao final.

---

## 12. Definition of Done

- migration criada e validada;
- tabela contém somente os dois campos solicitados;
- job executa no horário configurado, padrão 22:00, no timezone correto;
- download usa fonte configurável;
- parser suporta `.xls` e `.xlsx`;
- valor de 12 meses é extraído corretamente;
- taxa é persistida como percentual com quatro casas;
- execução é idempotente;
- concorrência entre instâncias está protegida;
- valor anterior é preservado em falhas;
- arquivo é removido em todos os caminhos após sua criação;
- logs não expõem dados sensíveis;
- testes unitários e de integração passam;
- documentação de variáveis de ambiente atualizada.

---

## 13. Assunções registradas

1. “Taxa IMA-B 5” significa, nesta feature, a coluna oficial **“Variação 12 meses (%)”**.
2. O valor será persistido em unidade percentual: `12,8000` vira `12.8000`.
3. A aplicação usa PostgreSQL.
4. O backend possui ou aceitará um mecanismo de agendamento.
5. O link direto do XLS será fornecido por configuração para evitar acoplamento a uma URL interna não documentada.
6. A execução ocorre todos os dias; em fins de semana e feriados, processar novamente o registro oficial mais recente é aceitável e idempotente.

