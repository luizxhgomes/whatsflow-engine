# docs/ — Navegação

Este diretório consolida documentação do projeto **api-oficial-core** (WhatsApp Business Intelligence Hub).

## Estrutura

| Pasta | Conteúdo | Quando consultar |
|-------|----------|------------------|
| [`stories/`](./stories/) | Stories de desenvolvimento (numeradas, seguem ciclo SDC) | Acompanhar/implementar trabalho em andamento |
| [`epics/`](./epics/) | Definições de épicos agregando stories | Contexto estratégico antes de abrir stories |
| [`prd/`](./prd/) | PRD sharded por épico | Requisitos, escopo, critérios de aceitação |
| [`architecture/`](./architecture/) | ADRs + diagramas | Entender decisões técnicas e tradeoffs |
| [`guides/`](./guides/) | Guias operacionais (how-to) | Rodar tarefas rotineiras (migrations, deploy, testes) |
| [`plans/`](./plans/) | Planos multi-fase (auditorias, refactors grandes) | Planejar trabalho que atravessa vários sprints |
| [`brand/`](./brand/) | Ativos e guidelines de marca | Design, copy, materiais externos |
| [`campaigns/`](./campaigns/) | Narrativas de campanhas específicas | Context de campanhas de marketing |
| [`storytelling/`](./storytelling/) | Manifesto do projeto, história, pitch | Onboarding, contexto estratégico |

## Outros Docs Relevantes Fora de `docs/`

| Caminho | Propósito |
|---------|-----------|
| [`../CLAUDE.md`](../.claude/CLAUDE.md) | Regras e contexto para Claude Code |
| [`../AGENTS.md`](../AGENTS.md) | Shortcuts de agentes para Codex CLI |
| [`../arsenal/README.md`](../arsenal/README.md) | Base de conhecimento WhatsApp (8 categorias, 24 arquivos) |
| [`../arsenal/INDEX.md`](../arsenal/INDEX.md) | Índice completo do arsenal |
| [`../app/CLAUDE.md`](../app/CLAUDE.md) | Guia técnico da implementação de referência |

## Convenções

- **Linguagem:** Português (pt-BR) para narrativa; inglês para código, identificadores e IDs de stories.
- **Arquivos Markdown:** respeitam `.editorconfig` raiz (LF, UTF-8, 2 espaços).
- **ADRs:** formato [MADR-like](https://adr.github.io/madr/); numeração sequencial; status explícito (`Proposed`, `Accepted`, `Deprecated`, `Superseded`).
- **Stories:** padrão `{epicNum}.{storyNum}.{slug}.story.md`; status no topo (`Draft`, `Ready`, `InProgress`, `InReview`, `Done`, `Blocked`).
- **Guides:** nome imperativo (`running-migrations.md`, não `migrations-guide.md`).

## Referências de Planos Ativos

- [`plans/2026-04-24-repo-sweep-plan.md`](./plans/2026-04-24-repo-sweep-plan.md) — varredura, limpeza e reorganização do repositório (5 fases).
