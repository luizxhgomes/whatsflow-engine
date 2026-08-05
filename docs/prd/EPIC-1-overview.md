# PRD — EPIC-1: Inbox Tags, Filters, Reply Status

**Status:** Em andamento (3 stories InProgress há ~36 dias — requer revisão)
**Epic owner:** `@pm`
**Stories:** [`1.1.tag-system`](../stories/1.1.tag-system.md), [`1.2.advanced-filters`](../stories/1.2.advanced-filters.md), [`1.3.reply-status-tabs`](../stories/1.3.reply-status-tabs.md)
**Epic file:** [`../epics/EPIC-1-inbox-tags-filters-reply-status.md`](../epics/EPIC-1-inbox-tags-filters-reply-status.md)

## Objetivo

Transformar o Inbox do WhatsFlow de uma lista cronológica simples em uma ferramenta de **triagem produtiva**: o operador consegue filtrar conversas por tags, estado de resposta e critérios avançados, gastando menos tempo para identificar o que precisa de ação.

## Problema

Hoje o Inbox é um fluxo linear de conversas. Operadores que atendem dezenas ou centenas de contatos simultaneamente:
- Não conseguem categorizar conversas (ex.: "lead quente", "suporte", "pós-venda").
- Perdem conversas pendentes entre tráfego de notificações automáticas.
- Não distinguem rapidamente "aguardando cliente" vs "aguardando operador".
- Não conseguem filtrar por múltiplos critérios (tag + data + status).

## Personas Atendidas

- **Operador de atendimento** — uso diário intensivo.
- **Gestor de vendas** — visão agregada de qualidade/velocidade de resposta.
- **Admin** — configura tags e regras do workspace.

## Escopo

### Story 1.1 — Tag System (fundacional)
- Criar tabelas `tags` e `contact_tags` (join).
- CRUD de tags no settings da conta.
- Aplicar tag a contato (single + bulk).
- UI: chips coloridos na lista de conversas e tela do contato.
- API para criar/remover tag de contato.

### Story 1.2 — Advanced Filters (depende de 1.1)
- Filtros múltiplos: tag, data de último contato, status de resposta, opt-in/opt-out.
- Combinar filtros com AND (default) e OR (explícito).
- Filtros salvos como "views" reutilizáveis.
- Performance: filtros executam no servidor, não no client.

### Story 1.3 — Reply Status Tabs (independente, mas complementa 1.2)
- Abas: "Todas" / "Aguardando cliente" / "Aguardando operador" / "Resolvidas".
- Classificação automática baseada em última mensagem:
  - Última mensagem do contato + sem resposta operador > X min → "Aguardando operador".
  - Última mensagem do operador → "Aguardando cliente".
  - Conversa marcada manualmente como resolvida → "Resolvidas".
- Contador por aba em tempo real (via Supabase Realtime).

## Fora do Escopo

- Tags automáticas por regras (será épico separado).
- SLAs com alerta — futuro.
- Assignees (quem está responsável pela conversa) — futuro.
- Exportação de views filtradas — futuro.

## Requisitos Não-Funcionais

| Categoria | Requisito |
|-----------|-----------|
| Performance | Filtro com 10k contatos retorna em < 500ms p95 |
| Realtime | Contadores de abas atualizam em < 2s após mudança |
| Acessibilidade | Cores de tags com contraste AA; abas navegáveis via teclado |
| Mobile | Responsivo; tags não quebram layout em telas < 375px |
| Escalabilidade | Modelo suporta 100+ tags por workspace, 1M+ contatos |

## Critérios de Sucesso (medição pós-lançamento)

- Tempo médio para achar conversa específica cai ≥ 30% (medido via UX telemetry).
- Taxa de conversas "respondidas dentro de 30min" aumenta ≥ 15%.
- Adoção: ≥ 70% dos workspaces ativos usam ao menos uma tag em 30 dias após lançamento.
- Zero regressões nas jornadas de inbox pré-existentes (envio, recebimento, atribuição).

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Filtros lentos com muitos contatos | Alto | Indexes compostos; testar com dataset de 100k em staging |
| UI poluída com muitas tags | Médio | Limite visual (3 tags + overflow); regras de compressão |
| Realtime não escala | Alto | Throttle de eventos; fallback para polling |
| Story 1.2 depende de 1.1 estar estável | Alto | 1.1 passa por QA gate antes de 1.2 começar |

## Status Atual (2026-04-24)

**⚠️ Atenção:** as 3 stories estão marcadas como `InProgress` desde 2026-03-19/20 — há **36 dias sem movimento** rastreável. Possíveis estados reais:
- Feita mas não promovida para `Done`/`Merged`.
- Bloqueada por dependência externa (API, design).
- Abandonada e precisa ser movida para `Blocked` ou `Draft`.

Revisão por `@po` na Fase 1 do repo-sweep-plan — ver [`plans/2026-04-24-repo-sweep-plan.md`](../plans/2026-04-24-repo-sweep-plan.md) (item H6).

## Referências

- [`../stories/1.1.tag-system.md`](../stories/1.1.tag-system.md)
- [`../stories/1.2.advanced-filters.md`](../stories/1.2.advanced-filters.md)
- [`../stories/1.3.reply-status-tabs.md`](../stories/1.3.reply-status-tabs.md)
- `app/supabase/migrations/` — migrations 20+ tratam de tags
- `app/app/(dashboard)/inbox/` — UI do inbox
