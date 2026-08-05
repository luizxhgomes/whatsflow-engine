# Garantias de Entrega do WhatsFlow Engine

Documento de verificação escrito a partir do código real do repositório. Cada garantia abaixo aponta
o mecanismo, o arquivo onde ele vive, os limites conhecidos e o passo que o replicador executa para
confirmar que aquilo funciona na instalação dele.

Escopo: recebimento de webhooks da Meta (WhatsApp Cloud API), deduplicação de eventos, fila de
disparo, controle adaptativo de vazão e rastreio de status por mensagem até as métricas de campanha.

---

## 1. Autenticidade do webhook (assinatura HMAC-SHA256)

**O que o sistema garante.** Nenhum evento de webhook é processado sem que a assinatura
`X-Hub-Signature-256` enviada pela Meta seja validada contra o segredo do aplicativo. A política é
fail-close: sem segredo configurado, o endpoint recusa o tráfego em vez de aceitar payload não
assinado.

**Como (mecanismo + path).**

- `app/app/api/webhook/route.ts`, função `verifyMetaWebhookSignature` (linhas 150 a 188): calcula
  `sha256=HMAC_SHA256(rawBody, appSecret)` com `node:crypto` e compara com o header usando
  `timingSafeEqual`, com checagem prévia de comprimento para evitar exceção na comparação.
- O corpo usado no HMAC é o texto bruto (`await request.text()` na linha 596), antes de qualquer
  parse de JSON. Isso é essencial: reserializar o JSON quebraria a assinatura.
- Resolução do segredo em `resolveMetaAppSecret` (linhas 122 a 136), com prioridade
  `process.env.META_APP_SECRET` e fallback para a chave `metaAppSecret` da tabela `settings`
  (gravada por `/api/settings/meta-app`).
- Respostas no handler `POST` (linhas 602 a 615):
  - segredo ausente: HTTP 503 com header `Retry-After: 300`, para que a Meta reenvie depois que o
    operador regularizar a configuração;
  - header ausente ou malformado, ou assinatura inválida: HTTP 401, evento descartado pela Meta.
- Bypass de desenvolvimento: `WEBHOOK_ALLOW_UNSIGNED=true` só tem efeito quando o segredo está
  ausente; nesse caso a requisição passa em modo `dev_bypass` com log de aviso marcado como
  `[Webhook][SECURITY]` (linhas 156 a 162).
- Verificação de assinatura documentada também em `docs/architecture/ADR-003-auth-layering.md`.
- O handshake de verificação (`GET`) é separado e usa o verify token (`hub.verify_token`), retornando
  403 quando não confere (linhas 585 a 592).

**Limites conhecidos.**

- `WEBHOOK_ALLOW_UNSIGNED=true` em produção reabre o vetor de webhook forjado. A variável não tem
  guarda por ambiente no código: quem definir, desliga a proteção.
- O segredo pode vir da tabela `settings`. Quem tiver escrita nessa tabela influencia a validação.
- O teste automatizado `app/lib/webhook-signature.test.ts` replica a lógica em uma cópia local
  (a função real não é exportada) e essa cópia ainda usa o comportamento antigo `if (!appSecret)
  return true`. O teste valida o algoritmo, não a política fail-close vigente.

**Como o replicador testa.**

```bash
# 1) assinatura correta: deve responder 200
PAYLOAD='{"object":"whatsapp_business_account","entry":[]}'
SIG=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$META_APP_SECRET" | cut -d' ' -f2)
curl -i -X POST "$APP_URL/api/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -d "$PAYLOAD"

# 2) assinatura adulterada: deve responder 401
curl -i -X POST "$APP_URL/api/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=deadbeef" \
  -d "$PAYLOAD"

# 3) sem META_APP_SECRET e sem metaAppSecret em settings: deve responder 503 com Retry-After
```

Confirme ainda que `WEBHOOK_ALLOW_UNSIGNED` não está definida no ambiente de produção:

```bash
vercel env ls | grep -i WEBHOOK_ALLOW_UNSIGNED
```

---

## 2. Deduplicação de eventos

**O que o sistema garante.** Um mesmo evento de status reenviado pela Meta (retry, duplicata) não
gera contagem dobrada nas métricas de campanha. A proteção é feita em duas camadas: uma barata em
Redis, antes de tocar no Postgres, e uma definitiva por índice único no banco.

**Como (mecanismo + path).**

- Camada 1, Redis: `app/lib/whatsapp-webhook-dedupe.ts`, função
  `shouldProcessWhatsAppStatusEvent`. Usa `SET key '1' NX EX ttl` com chave
  `wa:status:dedupe:{messageId}:{status}`. TTL vem de `WHATSAPP_STATUS_DEDUPE_TTL_SECONDS`, padrão
  de 7 dias, clampado entre 60 segundos e 30 dias. Chamada no laço de status do webhook em
  `app/app/api/webhook/route.ts` linha 798, antes de qualquer escrita no Supabase.
- Cliente Redis em `app/lib/redis.ts`: só existe quando `UPSTASH_REDIS_REST_URL` e
  `UPSTASH_REDIS_REST_TOKEN` estão presentes; caso contrário `redis` é `null`.
- Camada 2, banco: `app/lib/whatsapp-status-events.ts`, `buildStatusEventDedupeKey`
  (`messageId:status:timestampBruto`) e `recordStatusEvent`, que faz `upsert` com
  `onConflict: 'dedupe_key'` na tabela `whatsapp_status_events`. O índice único
  `ux_whatsapp_status_events_dedupe_key` está em
  `app/supabase/migrations/00000000000000_init.sql` (linha 1544).
- Camada 3, aplicação idempotente: em `applyStatusUpdateToCampaignContact` os updates carregam
  filtros negativos (`.neq('status','delivered')`, `.neq('status','read')`,
  `.neq('status','failed')`) e só incrementam o contador da campanha quando o update realmente
  afetou linhas. Há também uma ordem de status (`pending < sent < delivered < read`) que impede
  regressão.
- Registro auditável de eventos que não são de status: tabela `webhook_events`, criada em
  `app/supabase/migrations/20260319000004_add_webhook_events_and_template_quality.sql`, alimentada
  por `logWebhookEvent` em `app/lib/webhook-event-handlers.ts`. Atenção: essa tabela é log
  append-only, não tem chave de dedupe.

**Limites conhecidos.**

- O dedupe em Redis é fail-open por decisão explícita: sem Redis configurado, ou em erro de Redis,
  a função retorna `true` e o evento segue. A correção continua garantida pelas camadas 2 e 3, o
  que muda é o custo em Postgres.
- A chave do Redis ignora o timestamp; a chave do banco inclui. São critérios diferentes de
  duplicata, então o mesmo status com timestamps distintos é uma linha nova no banco mas pode ser
  cortado pelo Redis dentro do TTL.
- `webhook_events` não deduplica. Reentregas da Meta viram linhas repetidas nesse log.

**Como o replicador testa.**

```bash
# Enviar o MESMO payload de status duas vezes e conferir que o contador nao dobra.
# Antes e depois, consultar a campanha:
#   select id, sent, delivered, read, failed from campaigns where id = '<CAMPAIGN_ID>';
# E conferir a linha unica do evento:
#   select dedupe_key, attempts, apply_state from whatsapp_status_events
#     where message_id = '<WAMID>' order by last_received_at desc;
```

Teste unitário do dedupe e do throttle:

```bash
cd app && npx vitest run lib/whatsapp-adaptive-throttle.test.ts lib/webhook-signature.test.ts
```

---

## 3. Fila de disparo (QStash e Upstash Workflow) com retry

**O que o sistema garante.** O disparo de campanha não acontece dentro da requisição HTTP do
usuário. Ele é enfileirado e executado por um workflow durável, com retry automático da fila e com
os passos do envio isolados em etapas retomáveis.

**Como (mecanismo + path).**

- Enfileiramento: `app/app/api/campaign/dispatch/route.ts` (linhas 1024 a 1052). Em produção o
  `QSTASH_TOKEN` é obrigatório; sem ele a campanha é marcada como falha e a rota devolve 503. Com
  ele, o cliente `@upstash/qstash` chama `trigger` para `/api/campaign/workflow` com
  `retries: 3`. A rota responde 202 com `status: queued`.
- Bypass local: quando o host é localhost e não há `VERCEL_ENV`/`VERCEL`, o dispatch chama o
  endpoint de workflow direto por HTTP, porque a QStash não alcança localhost.
- Deployment Protection da Vercel: se `VERCEL_AUTOMATION_BYPASS_SECRET` existir, o header
  `x-vercel-protection-bypass` é anexado ao job.
- Execução: `app/app/api/campaign/workflow/route.ts` usa `serve` de `@upstash/workflow/nextjs`. O
  trabalho é quebrado em `context.run('init-campaign')`, `context.run('prepare-batches')`,
  `context.run('send-batch-N')` e `context.run('complete-campaign')`. Cada `context.run` é um passo
  com resultado persistido pela QStash, então uma reexecução do workflow não repete passos já
  concluídos.
- Idempotência do envio dentro do batch: `bulkClaimPendingForSend` (linha 332) faz o claim
  `pending -> sending` condicionado a `status = 'pending'`; só contatos efetivamente claimados são
  enviados. Isso evita envio duplicado quando um passo é reexecutado.
- Retries de aplicação, específicos: refresh de template e reenvio único quando a mídia do header
  expira (blocos de `template_refresh_retry` e rehost de mídia, linhas 1616 a 1900).
- Reconciliação assíncrona: `enqueueWebhookStatusReconcileBestEffort` em
  `app/lib/whatsapp-status-events.ts` publica um job QStash para
  `/api/webhook/reconcile-status-events` com `retries: 5`, `delay: 60` e `deduplicationId` por
  janela de 5 minutos, evitando enxurrada de jobs.
- Saúde da fila: `app/app/api/health/route.ts` e `app/lib/health-check.ts` reportam a presença do
  `QSTASH_TOKEN`; `app/app/api/meta/diagnostics/route.ts` alerta quando ele falta.

**Limites conhecidos.**

- Não há verificação de assinatura da QStash nos endpoints chamados por ela. A rota de reconciliação
  protege-se por bearer token próprio (`WHATSFLOW_ADMIN_KEY` ou `WHATSFLOW_API_KEY`), e a rota de
  workflow depende da validação embutida no `serve` do pacote Upstash. Variáveis
  `QSTASH_CURRENT_SIGNING_KEY` e `QSTASH_NEXT_SIGNING_KEY` não aparecem no código do repositório.
- O backoff entre tentativas é o padrão da QStash. O código só define o número de tentativas
  (3 no dispatch, 5 na reconciliação), não a curva de espera.
- `enqueueWebhookStatusReconcileBestEffort` sai em silêncio se faltar `QSTASH_TOKEN`, URL base
  (`NEXT_PUBLIC_APP_URL` ou variáveis da Vercel) ou o segredo administrativo. Sem esses três, não
  existe reconciliação automática.
- Não há cron declarado em `app/vercel.json` chamando a reconciliação periodicamente. Hoje ela só
  roda quando um evento sem correspondência ou com erro aciona o enfileiramento.

**Como o replicador testa.**

```bash
# 1) fila configurada
curl -s "$APP_URL/api/health" | jq '.services.qstash // .health.services.qstash'

# 2) disparo devolve 202 e status queued (a campanha nao envia na propria request)
#    conferir no painel da QStash que o job para /api/campaign/workflow foi criado

# 3) reconciliacao manual protegida por chave
curl -i "$APP_URL/api/webhook/reconcile-status-events?limit=50&key=$WHATSFLOW_ADMIN_KEY"
curl -i "$APP_URL/api/webhook/reconcile-status-events"   # deve responder 401
```

---

## 4. Throttling adaptativo de envio

**O que o sistema garante.** A taxa de envio (mensagens por segundo) se ajusta sozinha ao que a
Cloud API aceita: sobe devagar enquanto os lotes ficam estáveis e cai rápido, com cooldown, quando a
Meta retorna o erro 130429 (throughput excedido).

**Como (mecanismo + path).**

- Lógica: `app/lib/whatsapp-adaptive-throttle.ts`, algoritmo AIMD.
  - Aumento aditivo em `recordStableBatch`: passo de 5 por cento do alvo atual, mínimo de 1,
    respeitando `minIncreaseGapSec` entre aumentos e bloqueado durante cooldown.
  - Redução multiplicativa em `recordThroughputExceeded`: novo alvo igual a 60 por cento do
    anterior, piso em `minMps`, e cooldown de `cooldownSec` segundos aplicado sempre, mesmo quando
    o alvo já está no mínimo.
- Estado compartilhado entre invocações serverless na tabela `settings`, chave
  `whatsapp_adaptive_mps_state:{phoneNumberId}`, via `getAdaptiveThrottleState` e
  `setAdaptiveThrottleState`.
- Configuração com duas fontes: `getAdaptiveThrottleConfigWithSource` lê primeiro a chave
  `whatsapp_adaptive_throttle_config` da tabela `settings` (`source: 'db'`) e cai para as variáveis
  de ambiente (`source: 'env'`) quando não há valor válido.
- Variáveis lidas em `configFromEnv` (linhas 87 a 103):
  `WHATSAPP_ADAPTIVE_THROTTLE` (habilitado, padrão ligado quando indefinido; `'1'` liga
  explicitamente), `WHATSAPP_ADAPTIVE_START_MPS` (padrão 20),
  `WHATSAPP_ADAPTIVE_MAX_MPS` (80), `WHATSAPP_ADAPTIVE_MIN_MPS` (5),
  `WHATSAPP_ADAPTIVE_COOLDOWN_SEC` (30), `WHATSAPP_ADAPTIVE_MIN_INCREASE_GAP_SEC` (10),
  além de `WHATSAPP_SEND_CONCURRENCY` (2), `WHATSAPP_WORKFLOW_BATCH_SIZE` (40) e
  `WHATSAPP_SEND_FLOOR_DELAY_MS` (0). Todos passam por `clampInt`.
- Aplicação no envio: `app/app/api/campaign/workflow/route.ts` linhas 1191 a 1204 cria o limitador
  com `createRateLimiter(state.targetMps)`; na linha 1915, ao detectar 130429, chama
  `recordThroughputExceeded` e reajusta o limitador em tempo real com `limiter.updateRate`.
- Limitador propriamente dito: `app/lib/rate-limiter.ts`, token bucket com
  `MIN_RATE_LIMIT = 1` e `MAX_RATE_LIMIT = 1000`.
- Leitura e ajuste operacional: `app/app/api/settings/whatsapp-throttle/route.ts` expõe o estado e
  a configuração efetiva (inclusive os defaults vindos de env).

**Limites conhecidos.**

- O controle é global por `phoneNumberId`. Ele não substitui o limite por par de conversa
  (uma mensagem a cada 6 segundos por usuário), como o próprio comentário do módulo declara.
- O estado vive na tabela `settings`, ou seja, cada ajuste custa uma ida ao Postgres. Em alta
  concorrência entre invocações paralelas o último a escrever vence.
- O sinal de realimentação é o erro 130429. Outras formas de degradação (latência, qualidade do
  número, bloqueios) não movem o alvo.
- O alvo só sobe quando há lote estável. Campanhas curtas terminam antes de qualquer subida.

**Como o replicador testa.**

```bash
# estado e config efetiva do numero
curl -s "$APP_URL/api/settings/whatsapp-throttle?phoneNumberId=$PHONE_NUMBER_ID" | jq

# testes de unidade do algoritmo AIMD (subida, queda, cooldown, clamps)
cd app && npx vitest run lib/whatsapp-adaptive-throttle.test.ts
```

Para observar em produção, dispare uma campanha e acompanhe os traces de workflow: os eventos
registram `targetMps` do lote e a transição de `previousMps` para o novo alvo quando ocorre 130429.

---

## 5. Rastreio de status por mensagem até as métricas de campanha

**O que o sistema garante.** Cada mensagem de campanha tem estado próprio, com carimbo de tempo por
transição (`sending`, `sent`, `delivered`, `read`, `failed`, `skipped`), e todo evento de status
recebido da Meta é persistido antes de ser aplicado, de modo que nada se perde mesmo se a aplicação
falhar.

**Como (mecanismo + path).**

- Envio: `updateContactStatus` em `app/app/api/campaign/workflow/route.ts` (linhas 386 em diante)
  grava `status`, `sent_at` e `message_id` (o `wamid` da Meta) na tabela `campaign_contacts`, e
  limpa campos de falha anteriores em caso de reenvio. Falhas gravam `failure_code`,
  `failure_title`, `failure_details`, `failure_fbtrace_id`, `failure_subcode` e `failure_href`.
- Recepção: `app/app/api/webhook/route.ts`, laço de `statuses` (a partir da linha 785), na ordem
  dedupe, persistência durável, aplicação. Se a persistência falhar por motivo diferente de tabela
  ausente, o endpoint devolve 500 para que a Meta reenvie.
- Caixa de entrada durável: tabela `whatsapp_status_events`
  (`app/supabase/migrations/00000000000000_init.sql`, linha 1040) com `dedupe_key` único,
  `apply_state` (`pending`, `applied`, `unmatched`, `error`), `attempts`, `last_received_at`,
  `payload` e `errors`. Escrita por `recordStatusEvent` e atualizada por `markEventAttempt`
  (`app/lib/whatsapp-status-events.ts`).
- Aplicação: `applyStatusUpdateToCampaignContact` casa o evento pelo `message_id` em
  `campaign_contacts` (índice `idx_campaign_contacts_message_id`), respeita a ordem de status e
  incrementa o contador agregado da campanha pela função
  `increment_campaign_stat(campaign_id_input text, field text)` definida na migration inicial
  (linha 100), que soma em `campaigns.sent`, `delivered`, `read` e `failed`.
- Coerência entre entregue e lido: quando chega `read` sem `delivered` anterior, o código preenche
  `delivered_at` e incrementa `delivered` também, para que entregues nunca fiquem abaixo de lidas.
- Eventos sem correspondência: marcados como `unmatched` e enfileirados para reconciliação
  (`enqueueWebhookStatusReconcileBestEffort`). `reconcilePendingStatusEvents` varre até 500 eventos
  com `apply_state` diferente de `applied` e tenta aplicar de novo.
- Leitura na interface: `computeCampaignUiCounters` em `app/lib/campaign-ui-counters.ts` combina o
  agregado da campanha com a contagem ao vivo derivada de `campaign_contacts`, usando `Math.max`
  para nunca exibir número menor que o já observado, e deriva "entregues não lidas" como
  `deliveredTotal - read`.
- Correlação fim a fim: `trace_id` é gravado em `campaign_contacts` no claim e devolvido nos
  resultados de aplicação, permitindo ligar dispatch, workflow e webhook no mesmo rastro
  (`app/lib/workflow-trace.ts`).

**Limites conhecidos.**

- `reconcilePendingStatusEvents` ignora deliberadamente eventos de status `sent` e `failed`
  (linha 409 de `app/lib/whatsapp-status-events.ts`). Um `failed` que chegou como `unmatched`, por
  exemplo por corrida com a gravação do `message_id`, não é recuperado pela reconciliação.
- Existe modo de compatibilidade: se a tabela `whatsapp_status_events` não existir, o webhook segue
  sem persistência durável, apenas logando aviso. Nesse estado não há garantia de recuperação.
- Os contadores em `campaigns` são incrementais, não recalculados a partir de `campaign_contacts`.
  Divergência é mitigada na exibição (`Math.max` com a contagem ao vivo), não corrigida na fonte.
- `campaign_contacts.message_id` tem índice de busca, não índice único. O banco não impede dois
  contatos com o mesmo `wamid`, e a aplicação usa `limit(1)` na busca.
- `markEventAttempt` incrementa `attempts` com leitura seguida de escrita, sem função atômica. Em
  concorrência o contador pode ficar subestimado; isso é explicitamente tratado como não crítico
  no código.
- A rota de reconciliação aceita `GET`, o que facilita depuração mas exige que a chave não circule
  em logs de acesso ou histórico de navegador.

**Como o replicador testa.**

```sql
-- 1) uma mensagem enviada tem wamid e carimbo
select id, phone, status, sending_at, sent_at, delivered_at, read_at, failed_at, message_id, trace_id
from campaign_contacts where campaign_id = '<CAMPAIGN_ID>' order by sent_at desc limit 10;

-- 2) todo evento recebido esta na caixa duravel e foi aplicado
select status, apply_state, count(*) from whatsapp_status_events
where message_id in (select message_id from campaign_contacts where campaign_id = '<CAMPAIGN_ID>')
group by 1,2;

-- 3) agregado bate com o detalhado
select c.sent, c.delivered, c.read, c.failed,
       (select count(*) from campaign_contacts cc where cc.campaign_id = c.id and cc.status = 'read') as read_detalhado
from campaigns c where c.id = '<CAMPAIGN_ID>';
```

Depois, force a reconciliação e confira que `apply_state = 'unmatched'` diminui:

```bash
curl -s -X POST "$APP_URL/api/webhook/reconcile-status-events" \
  -H "Authorization: Bearer $WHATSFLOW_ADMIN_KEY" \
  -H "Content-Type: application/json" -d '{"limit":200}' | jq
```

---

## Tabela resumo

| Garantia | Mecanismo | Path real | Como testar |
| --- | --- | --- | --- |
| Só processa webhook autêntico | HMAC-SHA256 sobre o corpo bruto, `timingSafeEqual`, fail-close com 503 e 401 | `app/app/api/webhook/route.ts` (`verifyMetaWebhookSignature`, `resolveMetaAppSecret`) | `curl` com assinatura válida (200), adulterada (401) e sem segredo configurado (503) |
| Evento duplicado não conta duas vezes | `SET NX EX` no Redis, índice único `dedupe_key`, updates condicionais antes de incrementar | `app/lib/whatsapp-webhook-dedupe.ts`, `app/lib/whatsapp-status-events.ts`, `app/supabase/migrations/00000000000000_init.sql` | Reenviar o mesmo payload de status e comparar contadores da campanha antes e depois |
| Disparo não bloqueia a request e sobrevive a falhas | QStash `trigger` com `retries: 3` e workflow em passos `context.run` retomáveis, claim `pending -> sending` | `app/app/api/campaign/dispatch/route.ts`, `app/app/api/campaign/workflow/route.ts` | `GET /api/health` para a fila, disparo devolvendo 202 `queued`, job visível no painel da QStash |
| Recuperação de eventos não aplicados | Job QStash com `retries: 5`, `delay: 60` e dedupe por janela de 5 minutos, mais varredura de `apply_state` | `app/lib/whatsapp-status-events.ts`, `app/app/api/webhook/reconcile-status-events/route.ts` | `POST` autenticado na rota de reconciliação e verificação da queda de `unmatched` |
| Vazão se ajusta sozinha ao limite da Meta | AIMD com aumento de 5 por cento e redução para 60 por cento, cooldown, estado em `settings` | `app/lib/whatsapp-adaptive-throttle.ts`, `app/lib/rate-limiter.ts`, `app/app/api/campaign/workflow/route.ts` | `GET /api/settings/whatsapp-throttle` e `npx vitest run lib/whatsapp-adaptive-throttle.test.ts` |
| Status por mensagem com carimbo de tempo | `message_id` (wamid) em `campaign_contacts`, colunas `sending_at`, `sent_at`, `delivered_at`, `read_at`, `failed_at` | `app/app/api/campaign/workflow/route.ts` (`updateContactStatus`) | Consulta SQL em `campaign_contacts` filtrando pela campanha |
| Nenhum evento se perde antes de ser aplicado | Persistência primeiro em `whatsapp_status_events`, 500 no webhook em falha de gravação para forçar retry da Meta | `app/app/api/webhook/route.ts`, `app/lib/whatsapp-status-events.ts` | Comparar contagem por `apply_state` na tabela de eventos |
| Métrica de campanha reflete o evento | RPC `increment_campaign_stat` mais consolidação na interface com `Math.max` | `app/supabase/migrations/00000000000000_init.sql`, `app/lib/campaign-ui-counters.ts` | Conferir agregado em `campaigns` contra a contagem detalhada em `campaign_contacts` |

---

## Pendências

1. **Assinatura da QStash não verificada.** Não há uso de `Receiver` nem das variáveis
   `QSTASH_CURRENT_SIGNING_KEY` e `QSTASH_NEXT_SIGNING_KEY` no repositório. Os endpoints acionados
   pela fila dependem da validação interna do `serve` do pacote Upstash ou de bearer token próprio.
   Vale documentar ou implementar a verificação explícita.
2. **Reconciliação sem cron.** `app/vercel.json` não declara agendamento para
   `/api/webhook/reconcile-status-events`. A varredura só roda quando um evento `unmatched` ou com
   erro dispara o enfileiramento best-effort.
3. **Reconciliação ignora `failed` e `sent`.** Eventos desses dois status marcados como `unmatched`
   nunca são reprocessados, o que pode subnotificar falhas em corridas de gravação do `message_id`.
4. **Teste de assinatura desalinhado da implementação.** `app/lib/webhook-signature.test.ts` replica
   a função e mantém o comportamento antigo `if (!appSecret) return true`. Não existe teste que
   cubra a política fail-close atual nem o caminho `WEBHOOK_ALLOW_UNSIGNED`.
5. **`WEBHOOK_ALLOW_UNSIGNED` sem guarda de ambiente.** A variável desativa a validação em qualquer
   ambiente. Uma checagem por `NODE_ENV` ou `VERCEL_ENV` deixaria o bypass restrito a
   desenvolvimento, como o comentário do código já promete.
6. **`campaign_contacts.message_id` sem índice único.** O banco não impede colisão de `wamid` entre
   linhas; a aplicação assume unicidade usando `limit(1)`.
7. **Contadores de campanha não têm rotina de recontagem.** Divergência entre `campaigns` e
   `campaign_contacts` é apenas mascarada na leitura. Não existe rotina que recalcule o agregado a
   partir do detalhado.
8. **`webhook_events` sem deduplicação.** O log de eventos que não são de status aceita duplicatas
   em reentregas da Meta, o que distorce qualquer análise feita direto sobre essa tabela.
9. **Dedupe fail-open sem alarme.** Quando o Redis não está configurado ou falha, o sistema segue
   correto porém mais caro em Postgres, e o único sinal é um `console.warn`. Não há métrica nem
   alerta associado.
