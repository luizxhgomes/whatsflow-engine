# Changelog

Todas as mudanças relevantes deste repositório serão documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento semântico quando aplicável aos subprojetos.

## [Unreleased]

### Added
- `docs/README.md` com navegação central da documentação.
- `docs/CHANGELOG.md` e `docs/CONTRIBUTING.md`.
- `docs/architecture/` com 4 ADRs iniciais (ADR-001..004) registrando decisões críticas do repo-sweep.
- `docs/guides/` com guias operacionais (running-migrations, testing-whatsapp-flows, deploy-checklist).
- `docs/prd/EPIC-1-overview.md` formalizando o épico de inbox tags/filters/reply-status.
- `docs/agents-memory-inventory.md` mapeando os MEMORY.md dos 10 agentes AIOX.
- `docs/plans/2026-04-24-repo-sweep-plan.md`: plano multi-fase da auditoria completa.
- `.editorconfig` e `.prettierrc.json` no root para consistência entre subprojetos.
- `.aiox-core/.deprecated/` com README e subdiretórios por tipo de artefato + política de lifecycle.
- `README.md` no root do monorepo com overview e ponteiros.
- `.github/workflows/ci.yml` com pipeline mínimo de lint + typecheck + test para `app/`.

### Changed
- `.claude/settings.local.json`: reduzido de 211 para ~120 entradas, removidos shell-var assignments, grep patterns de credenciais e comandos ultra-específicos: consolidado por categoria.
- `.claude/CLAUDE.md`: estrutura do framework atualizada para refletir a realidade (`.aiox-core/`, `.claude/rules/`, `docs/` expandido).
- `app/lib/whatsapp/interactive.ts`: `console.warn` agora usa logging estruturado sem conteúdo sensível (apenas `originalLength` + `maxLength`).

### Security
- Removidos grep patterns que escaneavam variáveis de credenciais das permissões locais (`QSTASH_*_SIGNING_KEY`, `UPSTASH_WORKFLOW_URL`).
- `.gitignore` fortalecido: bloqueia todos `.env.*` exceto templates (`.env.example`, `.env.sample`, `.env.template`); adiciona `*.key`, `*.pem`, `*.p12`, `*.keystore`, `secrets.json`, `credentials.json`.
- **Descoberto:** `.env` nunca esteve trackeado no Git (auditoria inicial era falso positivo). Proteção mantida preventivamente.

### Fixed
- `app/lib/builder/plugins.ts`: placeholder legado `"Powered by WhatsFlow"` atualizado para `"Powered by WhatsFlow"` (projeto foi renomeado).

### Deprecated
- `app/lib/whatsapp/errors.ts` marcado como `@deprecated` via JSDoc. Classe `MetaAPIError` agora re-exportada pelo módulo canônico `@/lib/whatsapp-errors`. Call-sites existentes continuam funcionando; novos imports devem usar o canônico. Ver [ADR-002](./architecture/ADR-002-error-handling.md).

### Removed
- Diretórios vazios órfãos:
  - `.claude/agent-memory/copy-chief/`
  - `squads/copy/tests/`
  - `app/.claude/agent-memory/aios-devops/` (typo: era `aios`, não `aiox`)

### Pending (Fase 0, ordem recomendada)
1. **C5**: Webhook signature fail-close quando `META_APP_SECRET` ausente (baixo risco).
2. **C6**: Two-phase dedup de webhooks + unique constraint idempotente (ADR-004).
3. **C2**: `verifyApiKey()` em POST `/api/campaigns`.
4. **C3**: Auth em POST `/api/templates` + migrar 3 call-sites de `source=local` antes de remover bypass.
5. **C4**: `AUTH_POLICY` canônico com helper `requireAuth()` + CI guardrail (ADR-003).

### Pending (Fase 1 restante)
- **H1**: `.aiox-core/development/agents/MANIFEST.yaml` canônico (ADR-001).
- **H3**: merge de duplicações de conteúdo entre as 3 rules WhatsApp (manter arquivos, remover repetição).
- **H4**: migrar 2 call-sites remanescentes para `@/lib/whatsapp-errors`:
  - `app/app/api/templates/drafts/[id]/submit/route.ts:5`
  - `app/app/api/templates/create/route.ts:5`
- **H6**: `@po` revisa stories 1.1/1.2/1.3 (InProgress há 36+ dias).
- **H7/H8**: validar `entity-registry.yaml` e `workflow-chains.yaml`.

---

## Fase 4, Refinamento Contextual do Arsenal (2026-04-24)

### Added
- **`arsenal/CROSS-REFERENCE.yaml`**: índice machine-readable mapeando intents/sintomas → arquivo → seção → código de referência. Serve como entry point para LLMs e humanos (70+ entradas).
- **`arsenal/mercado/compliance-verticals.md`**: 5 playbooks verticais completos (healthcare, fintech, e-commerce, logística, educação) com reguladores, consent obrigatório, conteúdo proibido, template strategy, retenção, incident response e checklist de 10 itens cada.
- **Decision tree mermaid no `error-codes-complete.md`**: top 10 códigos mapeados como fluxograma visual (sintoma → diagnóstico → ação → política de retry). Complementado com **Retry Policy Matrix** (por categoria) e **Alert Escalation Matrix** (severidade, canal, prazo).
- **10 cenários de erro em `whatsapp-flows.md`**: error recovery patterns completos: chave privada inválida, timeout, JSON inválido, flow_token não encontrado, dados dinâmicos indisponíveis, BACK em tela inicial, campos obrigatórios ausentes, validação de data, re-submissão duplicada, falha em side-effect. Cada um com sintoma/causa/recuperação + pattern de handler com try-catch e monitoring checklist.
- **Mapa "caso → features & código" em `cases/use-cases-patterns.md`**: 10 casos de uso linkados a features-capabilities.md e paths de código em app/lib/.

### Changed
- **`arsenal/produto/local-api-sunset.md`**: reformulado como documento **histórico** (sunset concluído em outubro/2025, estamos em abril/2026). Status "📜 HISTÓRICO" no topo + timeline atualizado marcando o sunset como concluído.
- **Todos os 8 arquivos em `arsenal/tecnologia/`** ganharam bloco de metadata no topo:
  ```
  > Last Verified: 2026-04-24 · API Version: · Review cycle: trimestral
  > Cross-refs: [CROSS-REFERENCE.yaml] · [código de referência]
  ```
- **`arsenal/README.md`**: reescrito refletindo 25 arquivos (era 24), seção "Consulta rápida" via CROSS-REFERENCE.yaml, explicação da metadata padronizada, review cycle formalizado.
- **`arsenal/INDEX.md`**: atualizado para 25 arquivos + 2 índices; nova seção "Enriquecimentos pós-Fase 4" com benefícios de cada mudança.

### Resolved from plan
- **M3**: Last Verified dates em tecnologia/*
- **M4**: Cross-reference index (`CROSS-REFERENCE.yaml`)
- **M5**: Error-action decision tree (mermaid + matrices)
- **M6**: local-api-sunset como histórico
- **M7**: whatsapp-flows com error scenarios
- **M8**: compliance playbooks por vertical

---

## Fase 0 C5, Webhook Signature Fail-Close (2026-04-24)

### Security (CRITICAL)
- **`app/app/api/webhook/route.ts`**: verificação de assinatura HMAC-SHA256 agora é **fail-close** por padrão. O comportamento anterior (`if (!appSecret) return true`) permitia aceitar webhooks não assinados quando `META_APP_SECRET` estava ausente: vetor para webhooks forjados.

### Added
- Tipo `WebhookSignatureResult` diferencia `missing_secret`, `missing_header`, `invalid_signature` e estados válidos (`verified`, `dev_bypass`).
- Helper `resolveMetaAppSecret()` busca o secret com fallback: (1) `process.env.META_APP_SECRET`, (2) `settingsDb.get('metaAppSecret')` (já persistido via `/api/settings/meta-app`).
- Flag explícita `WEBHOOK_ALLOW_UNSIGNED=true`, bypass apenas para ambientes de desenvolvimento, com log warn ruidoso.
- Logs estruturados:
  - `[Webhook][CRITICAL]` quando secret ausente em produção.
  - `[Webhook][SECURITY]` quando bypass dev ativo.
  - Erros de settings DB logados explicitamente.

### Changed
- Call-site de `verifyMetaWebhookSignature` no POST handler agora retorna **503 `Retry-After: 300`** para `missing_secret` (Meta retry após operador configurar), mantendo **401** para `missing_header` e `invalid_signature` (Meta descarta, comportamento correto para webhook forjado/malformado).

### Impact
| Cenário | Antes | Depois |
|---------|-------|--------|
| Prod com secret correto | ✅ Valida HMAC | ✅ Valida HMAC |
| Prod sem secret | ❌ **Aceita webhooks forjados** | 🟢 503 + log critical; Meta retry |
| Dev local sem secret + `WEBHOOK_ALLOW_UNSIGNED=true` | Passava silenciosamente | Passa com log warn `[SECURITY]` |
| Dev local sem secret sem flag | Passava | 503 (força setar flag ou secret) |
| Assinatura inválida (tampered) | 401 | 401 |
| Header ausente | 401 | 401 |

### Files touched
- `app/app/api/webhook/route.ts` (2 edits: função + call-site)

### Typecheck
- `npx tsc --noEmit --skipLibCheck`: sem erros relacionados ao arquivo editado.

### Pending (Fase 0 restante)
- **C6**: Two-phase dedup (ADR-004) + unique constraint idempotente em `campaign_contacts`.
- **C2**: `verifyApiKey()` em POST `/api/campaigns`.
- **C3**: Auth em POST `/api/templates` + migrar 3 call-sites de `source=local`.
- **C4**: `AUTH_POLICY` canônico (ADR-003).

### Pending (Fases 4-5)
- Atualizar arsenal para Cloud API.1+.
- Criar cross-reference index entre arquivos do arsenal.
- Decision tree (mermaid) para top 10 error codes.
- Compliance playbooks por vertical (healthcare, fintech, e-commerce).
- Rate limit per-account em `lib/whatsapp-send.ts`.
- Template variable pre-flight validation em `lib/whatsapp/template-contract.ts`.

---

**Base inicial do changelog:** 2026-04-24 (criado junto da Fase 2/3 do repo-sweep).
