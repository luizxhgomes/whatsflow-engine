# Onboarding de Implementação (white-label)

O WhatsFlow Engine é white-label por desenho: uma instância nova é um número novo, um negócio novo.
Este documento é a jornada orquestrada de quem implanta o sistema do zero, em 5 fases com
gates verificáveis. Cada fase referencia os documentos de sustentação em `docs/seguranca/`.

```
Fase 0          Fase 1            Fase 2             Fase 3              Fase 4
Instalar   ->   Conectar Meta ->  Aquecer número ->  Primeira campanha -> Operação contínua
(30 min)        (1 a 2 dias)      (2 a 4 semanas)    (1 dia)             (sempre)
```

## Fase 0: Instalar (30 minutos)

1. Provisionar Supabase, Upstash (QStash + Redis) e Vercel conforme [`docs/setup/README.md`](../setup/README.md).
2. `cp app/.env.example app/.env` e preencher todos os grupos, incluindo o bloco
   de throttling adaptativo (anti-bloqueio preventivo).
3. Rodar as migrations de `app/supabase/migrations/` inteiras e em ordem
   (inclui o hardening de RLS de `webhook_events`).
4. Deploy e wizard: o installer embutido (`/api/installer`) automatiza Supabase e Vercel.

**Gate de saída:** `/api/health` responde OK e o diagnóstico Meta abre no dashboard.

## Fase 1: Conectar a API Oficial (1 a 2 dias)

1. App Meta Business, WABA, número registrado e token permanente de System User.
2. Webhook apontado para `/api/webhook` com verify token e `META_APP_SECRET` configurado.
   A assinatura HMAC é obrigatória: nunca ligue `WEBHOOK_ALLOW_UNSIGNED` em produção
   (ver [`GARANTIAS-DE-ENTREGA.md`](../seguranca/GARANTIAS-DE-ENTREGA.md)).
3. Criar e submeter os primeiros templates HSM para aprovação da Meta.
4. Ler o contrato de correspondências do sistema: [`CONTRATO-API-OFICIAL.md`](../seguranca/CONTRATO-API-OFICIAL.md)
   (tipos de mensagem, janela de 24 horas, códigos de erro).

**Gate de saída:** template de teste entregue no seu próprio número, status "entregue" visível na campanha.

## Fase 2: Aquecer o número (2 a 4 semanas)

O tier de mensageria começa em 250 conversas/dia e sobe com qualidade sustentada
(250 -> 1k -> 10k -> 100k -> ilimitado). Rampa recomendada e critérios completos em
[`GARANTIAS-ANTI-BLOQUEIO.md`](../seguranca/GARANTIAS-ANTI-BLOQUEIO.md), camada A.

1. Somente contatos com opt-in comprovado nesta fase.
2. Volume diário crescendo devagar; nunca saltar para o teto do tier no primeiro dia.
3. Quality rating VERDE por 7 dias consecutivos antes de aumentar volume.

**Gate de saída:** tier 1k alcançado com rating VERDE estável.

## Fase 3: Primeira campanha em massa (1 dia)

1. Rodar o checklist de 10 itens do playbook anti-bloqueio antes do disparo.
2. Lista importada com origem de opt-in documentada; suprimidos ficam fora
   (tabela `phone_suppressions`).
3. Throttling adaptativo ligado; acompanhar métricas por mensagem em tempo real.

**Gate de saída:** campanha concluída sem queda de quality rating e sem erros de rate limit.

## Fase 4: Operação contínua

1. Monitorar rating, tier e templates pausados no diagnóstico Meta.
2. Tratar opt-out imediatamente (automático por palavra-chave inbound).
3. Reconciliação de status e recontagem de métricas conforme garantias de entrega.

---

## Roadmap estratégico de implementação

Mapa consolidado da auditoria do squad WhatsApp (2026-08-05) sobre esta base de código.
O que já foi aplicado está marcado; o restante é backlog priorizado para quem opera ou contribui.

### Aplicado nesta versão

| Item | Origem | Mudança |
|---|---|---|
| RLS de `webhook_events` fechada para `anon` | Auditoria de compliance (P7) | migration `20260805000001_harden_webhook_events_rls.sql` |
| Envs `WHATSAPP_ADAPTIVE_*` documentadas | Auditoria de compliance (P8) | `app/.env.example` |
| Versão única da Graph API em todas as chamadas | Auditoria de contrato | rota de webhook unificada |
| Playbooks de sustentação | Squad completo | `docs/seguranca/` (3 documentos) |

### P0: fechar antes de campanha com base herdada ou de terceiro

| Prioridade | Pendência | Referência |
|---|---|---|
| P0-1 | Importação com estratégia `OPT_IN` reativa números suprimidos em lote (pode ressuscitar quem pediu para sair) | `GARANTIAS-ANTI-BLOQUEIO.md`, pendência P6 |
| P0-2 | Opt-in é declaração do operador, sem prova auditável de consentimento | idem, P1 |
| P0-3 | Verificação de assinatura da QStash ausente nas rotas de workflow | `GARANTIAS-DE-ENTREGA.md`, pendências |

### P1: robustez do disparo

| Prioridade | Pendência | Referência |
|---|---|---|
| P1-1 | Janela de 24 horas sem verificação preventiva no envio (viola só descobre pelo erro) | `CONTRATO-API-OFICIAL.md`, pendências |
| P1-2 | Throttling reage a rate limit mas não ao quality rating (webhooks de qualidade só alertam) | `GARANTIAS-ANTI-BLOQUEIO.md`, P4 |
| P1-3 | Pair rate limit e demais erros retryable sem consumo real de backoff | `CONTRATO-API-OFICIAL.md`, pendências |
| P1-4 | Qualidade VERMELHA não bloqueia envio, apenas avisa | `GARANTIAS-ANTI-BLOQUEIO.md`, P3 |
| P1-5 | Cron de reconciliação de status ausente do `vercel.json` | `GARANTIAS-DE-ENTREGA.md`, pendências |

### P2: higiene e evolução

Aquecimento automático de número (trava de rampa), expurgo de payloads antigos de
`webhook_events`, índice único em `campaign_contacts.message_id`, unificação dos dois
mapeamentos de erro, remoção de helpers inválidos sem consumidor, cobertura de teste do
fail-close do webhook. Detalhes em cada documento de `docs/seguranca/`.

## Jornada de contribuição

Contribuições seguem [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Para este backlog:
cada item Pn vira uma issue com o label `seguranca` ou `disparo`, referenciando o
documento de origem. Regra de ouro herdada da arquitetura: correção de garantia entra
com teste que prova a garantia.
