# ADR-001 — Fontes de Verdade Canônicas para Agents, Rules e Registry

**Status:** Proposed
**Data:** 2026-04-24
**Contexto:** Fase 1 do repo-sweep-plan

## Contexto

A auditoria identificou que o repositório mantém definições de agentes AIOX em **3 locais distintos**, gerando risco de drift:

1. `.claude/commands/AIOX/agents/*.md` — 14 arquivos (usados pelos slash-commands)
2. `.aiox-core/development/agents/*.md` + `MEMORY.md` — 10 agentes com memória
3. `.claude/CLAUDE.md` — tabela inline na seção "Sistema de Agentes"
4. `AGENTS.md` (root) — shortcuts para Codex CLI

Além disso:
- `entity-registry.yaml` está malformado (17k linhas, `usedBy` incompletos)
- `workflow-chains.yaml` pode referenciar tasks que não existem mais
- Rules WhatsApp estão divididas em 3 arquivos com sobreposição (`whatsapp-api-reference.md`, `whatsapp-message-patterns.md`, `whatsapp-compliance.md`)

## Decisão

### Agents — Single Source of Truth

1. **Canônico:** `.aiox-core/development/agents/{id}.md` — contém persona, commands, dependencies. É o **único** lugar autoritativo.
2. **Shortcuts:** `.claude/commands/AIOX/agents/*.md` são **aliases finos** que apenas invocam o arquivo canônico. Não duplicam conteúdo.
3. **Codex:** `AGENTS.md` (root) é gerado/mantido pelo template em `.aiox-core/product/templates/ide-rules/codex-rules.md` — serve apenas ao Codex CLI e referencia `.aiox-core/development/agents/` como fonte.
4. **CLAUDE.md:** a tabela na seção "Sistema de Agentes" é **informativa apenas** e deve referenciar `.aiox-core/development/agents/` como fonte. Não pode divergir.
5. Introduzir `.aiox-core/development/agents/MANIFEST.yaml` como índice machine-readable com: `id`, `persona`, `path`, `memoryPath`, `exclusiveOps`, `deprecated`. Usado por validadores e sync-scripts.

### Rules — Consolidação e Frontmatter

1. Rules WhatsApp (`whatsapp-api-reference.md`, `whatsapp-message-patterns.md`, `whatsapp-compliance.md`) permanecem **separadas por domínio** (API spec vs padrões vs compliance), mas:
   - Remover duplicações de conteúdo (regras 24h, categorias de template, opt-in).
   - Links cruzados via âncoras Markdown.
2. Toda rule com escopo contextual deve ter frontmatter `paths:` para auto-loading:
   ```markdown
   ---
   paths:
     - arsenal/tecnologia/**
     - app/**
   ---
   ```
3. Rules sem `paths:` são consideradas **globais** (carregam sempre).

### Registry e Workflow Chains

1. `entity-registry.yaml` é **autogerado** por `aiox graph --deps` e `sync-registry-intel`. Edição manual é proibida.
2. `workflow-chains.yaml` é validado em CI contra a existência de cada task/agent referenciado.
3. Arquivos órfãos (tasks não referenciadas por nenhum agente/workflow) são movidos para `.aiox-core/.deprecated/tasks/` após 1 sprint de aviso.

## Consequências

### Positivas
- Uma única edição propaga para toda a cadeia.
- Drift entre `.claude/commands/`, CLAUDE.md e `AGENTS.md` torna-se detectável em CI.
- Contributores novos encontram "o" arquivo de cada agente sem ambiguidade.
- Registry e workflow-chains tornam-se confiáveis como base para automação (IDS, handoffs).

### Negativas
- Requer 1 sprint de migração (reescrita dos shortcuts em `.claude/commands/AIOX/agents/` para aliases finos).
- CLAUDE.md e AGENTS.md precisam de sync automatizado (ou risco de drift volta).
- Rules WhatsApp consolidadas mudam URLs/âncoras — referências externas podem quebrar (mitigável via redirects de markdown).

### Riscos
- Se `MANIFEST.yaml` ficar desatualizado, vira nova fonte de verdade drift. Mitigação: validator em CI (`*validate-agents`).
- Auto-loading de rules via `paths:` depende do runtime do Claude Code suportar a feature; caso contrário, rules globais continuam o fallback.

## Alternativas Consideradas

### A. Manter 3 locais, sincronizar manualmente
**Rejeitada** porque o drift já aconteceu e continuará acontecendo.

### B. Eliminar `.claude/commands/AIOX/agents/` completamente
**Rejeitada** porque slash-commands precisam de arquivos nesses paths para serem descobríveis pelo Claude Code. A solução é fazê-los finos.

### C. Monorepo com workspace manifest (`pnpm-workspace.yaml`)
**Fora de escopo** — o problema é de docs/config, não de build.

## Plano de Implementação

Vinculado à Fase 1 do `docs/plans/2026-04-24-repo-sweep-plan.md`:

1. Criar `MANIFEST.yaml` com inventário atual.
2. Validar que todos os agentes referenciados existem em `.aiox-core/development/agents/`.
3. Reescrever arquivos em `.claude/commands/AIOX/agents/` como aliases finos.
4. Adicionar frontmatter `paths:` a rules contextuais.
5. Gerar `entity-registry.yaml` via `*sync-registry-intel`; remover edições manuais.
6. Adicionar CI step validando workflow-chains contra tasks existentes.

## Referências

- `.claude/rules/agent-authority.md`
- `.claude/rules/agent-memory-imports.md`
- `.aiox-core/constitution.md` (Artigo II — Agent Authority)
- `docs/plans/2026-04-24-repo-sweep-plan.md` (Fase 1)
