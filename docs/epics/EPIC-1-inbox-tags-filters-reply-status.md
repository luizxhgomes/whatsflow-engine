# Epic 1: Inbox Tags, Filtros Avancados & Separacao por Status de Resposta

## Goal

Evoluir o modulo Inbox do WhatsFlow para suportar gerenciamento de tags de leads, filtros avancados multi-criterio (seguindo referencia de UI com 12+ filtros) e separacao de conversas por status de resposta (respondidas/nao respondidas), permitindo ao operador organizar e priorizar atendimentos de forma eficiente.

## Background

O Inbox atual possui filtros basicos (status open/closed, mode bot/human, labels de conversa e busca textual). A necessidade e ampliar para um sistema completo de:
1. **Tags de lead** — classificacao permanente do contato (CRM), separadas das labels de conversa
2. **Filtros avancados** — 12+ criterios (etiqueta, telefone, nome, campanha, data, area code, campo personalizado, admin atribuido)
3. **Reply status** — separacao visual entre conversas aguardando resposta e ja respondidas

## Architectural Decisions (from @architect validation)

- Tags (CRM/lead) sao entidades separadas de Labels (conversa) — tabelas `tags` + `contact_tags`
- `reply_status` como campo derivado em `inbox_conversations`, atualizado automaticamente
- Filtros composable via Supabase query builder
- Campos novos: `assigned_to`, `campaign_id`, `source`, `reply_status` em `inbox_conversations`
- Indices compostos para performance dos filtros

## Complexity Assessment

| Dimension | Score |
|-----------|-------|
| Scope | 4 |
| Integration | 2 |
| Infrastructure | 2 |
| Knowledge | 2 |
| Risk | 3 |
| **Total** | **13 (STANDARD)** |

## Stories

### Story 1.1: Tag System (DB + API + UI)
Sistema CRUD de tags para leads/contatos com tabelas dedicadas, API REST e interface de gerenciamento.

### Story 1.2: Advanced Filters
Filtros avancados multi-criterio no Inbox com campos novos no DB, filter engine composable e UI de selecao de filtros.

### Story 1.3: Reply Status Tabs
Separacao de conversas por respondidas/nao respondidas com campo derivado, atualizacao automatica e tabs na UI.

## Execution Order

```
Story 1.1 (Tag System) → Story 1.2 (Advanced Filters) → Story 1.3 (Reply Status Tabs)
```

Story 1.1 e pre-requisito para 1.2 (tags precisam existir para serem filtradas). Story 1.3 e independente mas sequenciada por prioridade.

---
*Epic created by @pm (Morgan) — 2026-03-19*
*Architecture validated by @architect (Aria)*
