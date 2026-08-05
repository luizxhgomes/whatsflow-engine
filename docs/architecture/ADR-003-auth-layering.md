# ADR-003 — Auth Layering nos Endpoints do WhatsFlow

**Status:** Proposed (crítico — bloqueado por Fase 0 do repo-sweep)
**Data:** 2026-04-24
**Contexto:** Fase 0 + Fase 5 do repo-sweep-plan

## Contexto

A auditoria identificou que, de >150 endpoints em `app/app/api/**`, apenas 2 ocorrências de `verifyApiKey()` foram encontradas. Isso indica:

- **60+ endpoints potencialmente expostos** sem autenticação explícita.
- POST `/api/campaigns` e POST `/api/templates` confirmadamente sem auth (achados C2 e C3).
- Não existe middleware global de auth (o projeto é intencionalmente sem `middleware.ts`).
- Responsabilidade de auth está **espalhada** por route, sem inventário nem enforcement.

O projeto tem dois níveis de chave (`WHATSFLOW_API_KEY`, `WHATSFLOW_ADMIN_KEY`) mas falta política clara sobre quando cada um é requerido e quais rotas são legitimamente públicas.

## Decisão

### Classificação Obrigatória de Todas as Rotas

Toda rota em `app/app/api/**` deve se declarar em **uma** das 3 categorias:

| Categoria | Proteção | Exemplos |
|-----------|----------|----------|
| `PUBLIC` | Nenhum auth | `/api/webhook`, `/api/health`, `/api/flows/endpoint/*` (assinatura crypto própria) |
| `API_KEY` | `verifyApiKey(request)` com chave geral | `/api/campaigns`, `/api/templates`, `/api/contacts`, `/api/messages` |
| `ADMIN_KEY` | `verifyAdminKey(request)` com chave elevada | `/api/database/*`, `/api/vercel/*`, `/api/settings/*` (mutation) |

### Enforcement

1. **Inventário explícito** em `app/lib/auth-inventory.ts` (ou `auth.config.ts`):
   ```typescript
   export const AUTH_POLICY: Record<string, AuthLevel> = {
     '/api/webhook': 'PUBLIC',
     '/api/health': 'PUBLIC',
     '/api/flows/endpoint': 'PUBLIC',
     '/api/campaigns': 'API_KEY',
     '/api/templates': 'API_KEY',
     '/api/database': 'ADMIN_KEY',
     // ...
   }
   ```
2. **Helper unificado** `requireAuth(request, level)`:
   ```typescript
   export async function requireAuth(
     request: Request,
     level: 'API_KEY' | 'ADMIN_KEY'
   ): Promise<void | Response>
   // Retorna Response 401 ou void (passa)
   ```
3. **Padrão em toda route:**
   ```typescript
   export async function POST(request: Request) {
     const authError = await requireAuth(request, 'API_KEY')
     if (authError) return authError
     // ... business logic
   }
   ```
4. **Testes obrigatórios:** cada rota não-PUBLIC deve ter teste de 401 quando chave ausente ou inválida.
5. **CI guardrail:** script que lista rotas em `app/api/**` e falha se alguma não aparece em `AUTH_POLICY`.

### Webhook Signature (separado de API key)

Rotas `PUBLIC` que recebem webhooks (Meta, QStash, Upstash) **devem** verificar assinatura HMAC antes de processar:

- Meta webhooks: HMAC-SHA256 com `META_APP_SECRET` via `timingSafeEqual`.
- **Fail-close obrigatório:** se o secret não estiver configurado, retornar 503 (serviço indisponível) — nunca 200 (achado C5).
- QStash: verificação nativa do SDK Upstash.

### Rate Limit como Segunda Camada

Mesmo rotas autenticadas devem ter rate limit para mitigar abuse de credencial:
- Bucket por `phone_number_id` (ver ADR-005, a escrever).
- Limite baixo em operações caras (ex.: template sync: 10 req/min).

## Consequências

### Positivas
- Superfície de ataque drasticamente reduzida.
- Facilita auditoria futura: lista canônica de rotas + auth level.
- Testes regridem se alguém adicionar rota sem declarar nível.
- Onboarding mais simples ("quer criar rota? adicione entrada em AUTH_POLICY").

### Negativas
- Refactor cirúrgico de 60+ arquivos.
- Clientes externos (se existirem) precisam passar header — quebra se chamavam sem.
- Testes de integração existentes precisam ajuste para passar chave.

### Riscos
- Se o bypass `source=local` em GET `/api/templates` for amplamente usado internamente, remover pode quebrar features. Mitigação: auditar call-sites antes + manter temporariamente com auth fraca + deprecation log.

## Plano de Implementação

Dividido entre Fase 0 (crítico) e Fase 5 (fortificação):

### Fase 0 (imediato)
1. Adicionar `verifyApiKey()` em POST `/api/campaigns` e POST `/api/templates`.
2. Remover bypass `source=local` sem auth em GET `/api/templates`.
3. Fail-close webhook signature verification.

### Fase 5 (fortificação)
4. Criar `AUTH_POLICY` canônico.
5. Implementar `requireAuth` helper.
6. Migrar todas as rotas para o padrão.
7. Adicionar CI guardrail.
8. Testes 401 para cada rota não-PUBLIC.

## Referências

- `app/lib/auth.ts`
- `app/CLAUDE.md` (seção "Authentication")
- `.claude/rules/agent-authority.md`
- `docs/plans/2026-04-24-repo-sweep-plan.md` (C2-C5, Fase 5)
