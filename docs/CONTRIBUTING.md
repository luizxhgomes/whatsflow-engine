# Contributing

Guia para contribuir com `api-oficial-core`. Leia antes de abrir qualquer PR.

## Princípios

1. **Story-Driven Development** — todo trabalho começa como story em `docs/stories/`. Não existe "patch avulso".
2. **Constitution first** — artefatos da Constitution (`.aiox-core/constitution.md`) são inegociáveis.
3. **IDS (Incremental Development System)** — antes de criar algo novo, rode `*ids check {intent}` para descobrir se já existe algo reutilizável.
4. **No Invention** — não invente requisitos; tudo rastreável a FR/NFR/CON/research.
5. **Agent Authority** — delegação tem regras formais em `.claude/rules/agent-authority.md`. Em particular: `git push`, `gh pr create/merge`, MCP management → **exclusivo** de `@devops`.

## Fluxo de Trabalho (SDC — Story Development Cycle)

```
@sm *draft           → story.md (Draft)
@po *validate        → GO/NO-GO (Ready ou Draft+fixes)
@dev *develop        → implementação (InProgress → InReview)
@qa  *qa-gate        → PASS/CONCERNS/FAIL (Done ou de volta p/ @dev)
@devops *push        → git push + PR + merge (exclusivo)
```

Nenhum agente (exceto `@aiox-master` e `@devops`) deve executar git push ou criar PRs.

## Commits

- **Convencional**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `style:`.
- Referência a story quando aplicável: `feat: implement tag filter [Story 1.2]`.
- Mensagens em pt-BR ou en-US (consistência dentro do mesmo PR).
- Commits atômicos, um propósito por commit.

## Pull Requests

- Crie PR a partir de branch própria, nunca direto em `main`.
- Título no formato convencional (mesmo do commit).
- Descrição com: **Summary** (1-3 bullets), **Test plan** (checklist do que foi validado), story/epic relacionado.
- CI (lint + typecheck + tests) precisa passar.
- Revisão por `@qa` ou peer antes do merge.

## Code Standards

### Geral
- **Idioma:** código em inglês; comentários e UI em pt-BR.
- **Edite existentes > crie novos**. Reuso de componentes é preferencial.
- **Sem comentários redundantes** — só explique o "porquê" não-óbvio.
- **Trate erros explicitamente** — nada de `catch (e) {}` silencioso.

### TypeScript / JavaScript
- `strict: true`; sem `any` implícito.
- Nomes em `camelCase`, classes em `PascalCase`, constantes em `UPPER_SNAKE_CASE`.
- Respeite `.editorconfig` e `.prettierrc.json` (2 espaços, LF, 100 chars).

### WhatsApp-specific
- **Sempre** — nunca hardcode versão antiga da Meta Graph API.
- **Credentials via Supabase settings** — nunca hardcode tokens; env vars apenas como fallback.
- **E.164 sem `+`** — formato obrigatório para telefones.
- **Timeout + error mapping** em toda chamada à Meta API.
- **Webhook dedup** — Redis SET NX + TTL; nunca processar mesma mensagem duas vezes.

Referências: [`../.claude/rules/whatsapp-*.md`](../.claude/rules/).

## Testes

- Toda nova funcionalidade: ao menos 1 teste unitário e (quando aplicável) 1 teste de integração.
- `app/`: Vitest para unit, Playwright para E2E.
- Rodar antes do commit: `npm run lint && npm run test`.
- Edge cases obrigatórios: erro de API externa, input inválido, rate limit.

## Atualizando Documentação

- Mudou arquitetura? **ADR obrigatório** em `docs/architecture/`.
- Mudou processo operacional? **Atualize o guide correspondente** em `docs/guides/`.
- Adicionou/removeu subprojeto? **Atualize `docs/README.md` e `README.md` raiz**.
- Breaking change? **Entrada no `docs/CHANGELOG.md`**.

## Framework vs Projeto (L1-L4)

| Camada | Mutabilidade | Paths | Regra |
|--------|-------------|-------|-------|
| L1 Framework Core | NEVER modify | `.aiox-core/core/`, `constitution.md` | Protegido por deny rules |
| L2 Framework Templates | NEVER modify | `.aiox-core/development/{tasks,templates,checklists,workflows}/`, `.aiox-core/infrastructure/` | Extend-only |
| L3 Project Config | Mutable (exceções) | `.aiox-core/data/`, `MEMORY.md`, `core-config.yaml` | Allow rules permitem |
| L4 Project Runtime | ALWAYS modify | `docs/stories/`, `packages/`, `squads/`, `app/` | Trabalho do projeto |

## Quando Pedir Ajuda

- Arquitetura incerta → `@architect`
- Requisitos pouco claros → `@pm` ou `@po`
- Dúvida de implementação → `@dev` ou `@aiox-master`
- Validação/QA → `@qa`
- Git/CI/MCP → `@devops`
- Pesquisa → `@analyst`

## Código de Conduta

Seja respeitoso, direto e construtivo. Feedback no código, não na pessoa. Discussões técnicas são bem-vindas; flame wars não.
