# ADR-004 — Webhook Deduplication e Idempotência

**Status:** Proposed (crítico — bloqueado por Fase 0 do repo-sweep)
**Data:** 2026-04-24
**Contexto:** Fase 0 do repo-sweep-plan (achado C6)

## Contexto

A Meta Cloud API **pode entregar o mesmo webhook múltiplas vezes** (at-least-once). O projeto já tem `lib/whatsapp-webhook-dedupe.ts` usando Redis `SET NX` com TTL. Porém, a auditoria detectou **race condition** no fluxo atual:

1. Webhook A chega → `SET NX` grava → processa → resposta 200.
2. Webhook A' (duplicado) chega **antes** do TTL → `SET NX` falha → pula → resposta 200.

**Problema:** se o processamento do Webhook A ainda está em andamento quando A' chega, o segundo pode pular o processamento antes que o primeiro commite o estado no DB. Em retries intensos, ou com múltiplas instâncias serverless, há janela de duplicação.

Consequências observáveis:
- Duplicação de status em `campaign_contacts`.
- Alerts de pagamento disparados duas vezes.
- Contadores de delivered/read incrementados em dobro.
- Em casos extremos: cobrança duplicada se webhook dispara chamada de API externa.

## Decisão

### Two-Phase Dedup

Separar **claim** de **commit**:

1. **Phase 1 — Claim:** Redis `SET NX` com chave `webhook:claim:{message_id}:{status}` e TTL curto (5 min).
   - Se `SET NX` falha → abortar (já claimed).
   - Se sucede → prosseguir.
2. **Phase 2 — Process + Commit:** executa business logic, commita no Supabase usando **upsert idempotente** (unique constraint em `(message_id, status_type)`).
3. **Phase 3 — Mark Done:** Redis `SET` (sem NX) com chave `webhook:done:{message_id}:{status}` e TTL longo (24h). Sinaliza que processamento terminou.

### Supabase como Source of Truth

Banco tem unique constraint composta que rejeita duplicatas mesmo se Redis falhar (defense in depth):

```sql
ALTER TABLE campaign_contacts
  ADD CONSTRAINT unique_message_status
  UNIQUE (message_id, status);
```

Upserts usam `ON CONFLICT DO NOTHING` para status terminais (`delivered`, `read`, `failed`) e `ON CONFLICT DO UPDATE` para status progressivos (`sent` → `delivered`).

### Retry Policy

- Se o claim é adquirido mas processamento falha: deixar `webhook:claim:*` expirar naturalmente (5 min) para permitir retry da Meta.
- Se o claim é adquirido e processamento sucede: `webhook:done:*` ficar 24h.
- Logs estruturados para cada decisão: `claimed`, `skipped_duplicate`, `committed`, `skipped_done`.

### Múltiplos Status para Mesma Mensagem

Meta envia eventos separados: `sent` → `delivered` → `read` → `failed`. Chave de dedup **inclui status** (`webhook:claim:{message_id}:{status}`) — cada transição é um evento idempotente separado.

## Consequências

### Positivas
- Elimina race condition entre instâncias/threads concorrentes.
- Defense in depth: Redis falhando não quebra idempotência (DB constraint segura).
- Observabilidade melhor (logs claros de cada decisão).
- Permite retries da Meta sem duplicar trabalho.

### Negativas
- Migration SQL obrigatória (unique constraint pode falhar se dados históricos já têm duplicatas).
- Complexidade operacional: 2 chaves por mensagem no Redis (claim + done).

### Riscos
- Se `campaign_contacts` hoje tem duplicatas históricas, a migration falha.
  - **Mitigação:** script de backfill que deduplica antes de aplicar constraint; ou unique parcial com `WHERE created_at >= '2026-05-01'`.
- TTL de `webhook:claim:*` muito curto: retry da Meta após 5 min reprocessa. TTL muito longo: trava legítimos retries por muito tempo.
  - **Mitigação:** 5 min é confortável para processamento típico (< 1s); revisar se p99 > 1 min.

## Alternativas Consideradas

### A. Manter `SET NX` com TTL único (status quo)
**Rejeitada** — race condition persiste.

### B. Lock distribuído via Redlock
**Rejeitada** — complexidade alta demais para o ganho; Upstash Redis (plano single-region) não é ideal para Redlock correto.

### C. Queue com dedup nativo (QStash dedupIds)
**Avaliada** — aplicável apenas a mensagens que entram na queue, não a webhooks diretos do Meta. Complementar, não substitui.

### D. Database-only (sem Redis)
**Rejeitada** — alta latência para checks síncronos em rota de webhook (Meta tem timeout de 5s).

## Plano de Implementação

### Fase 0 (crítico)
1. Mudar `lib/whatsapp-webhook-dedupe.ts` para two-phase.
2. Adicionar logs estruturados para cada decisão.
3. Testes unitários simulando concorrência.

### Fase 3/5 (fortificação)
4. Migration Supabase adicionando unique constraint (com backfill se necessário).
5. Refactor upserts em `app/api/webhook/route.ts` para `ON CONFLICT` idempotente.
6. Stress test (`tests/stress/run-stress-test.ts`) validando ausência de duplicatas sob carga.

## Referências

- `app/lib/whatsapp-webhook-dedupe.ts`
- `app/app/api/webhook/route.ts`
- `.claude/rules/whatsapp-api-reference.md`
- `docs/plans/2026-04-24-repo-sweep-plan.md` (C6)
