# ADR-002 — Módulo Canônico de Error Handling WhatsApp

**Status:** Proposed
**Data:** 2026-04-24
**Contexto:** Fase 1 do repo-sweep-plan

## Contexto

A auditoria detectou **dois módulos separados** em `app/` responsáveis por error handling da WhatsApp Cloud API:

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `lib/whatsapp-errors.ts` | ~1132 | Mapeamento completo de 44+ códigos de erro com `type`, `message`, `action`, `retryable`, `userMessage` |
| `lib/whatsapp/errors.ts` | ~85 | Wrapper leve de exceção (classe `WhatsAppError`) |

Resultado atual:
- Dois call-sites podem usar módulos diferentes para a mesma situação.
- Mensagens para o usuário final divergem conforme o caminho do erro.
- Manter dois lugares significa que updates de códigos da Meta precisam ser aplicados em dois arquivos.
- Não há hierarquia clara: quando usar `WhatsAppError` (classe) vs `mapWhatsAppError()` (função)?

## Decisão

Adotar `lib/whatsapp-errors.ts` como **módulo canônico**. O arquivo `lib/whatsapp/errors.ts` passa a ser um thin wrapper que re-exporta o essencial ou é **removido**.

### Contrato Canônico

```typescript
// lib/whatsapp-errors.ts (canônico)

export type WhatsAppErrorCategory =
  | 'rate_limit'
  | 'recipient'
  | 'payment'
  | 'template'
  | 'auth'
  | 'system'
  | 'media'
  | 'unknown'

export interface MappedWhatsAppError {
  code: number
  category: WhatsAppErrorCategory
  message: string           // Internal description (para logs)
  action: string            // Próximo passo recomendado
  retryable: boolean
  userMessage: string       // Texto para UI/cliente final (pt-BR)
}

export function mapWhatsAppError(code: number, meta?: Record<string, unknown>): MappedWhatsAppError
export function isCriticalError(code: number): boolean
export function isOptOutError(code: number): boolean
export function isRetryable(code: number): boolean

export class WhatsAppApiError extends Error {
  constructor(
    public readonly mapped: MappedWhatsAppError,
    public readonly raw?: unknown
  )
}
```

### Regras de Uso

1. **Catching errors da Meta API:** sempre passar por `mapWhatsAppError(code)` antes de repropagar.
2. **Lançamento controlado:** usar `throw new WhatsAppApiError(mapped, raw)` — nunca `throw new Error("erro 131042")`.
3. **Retry decisions:** sempre checar `.retryable` do mapped; nunca tomar decisão de retry olhando apenas o código numérico.
4. **UI:** sempre renderizar `.userMessage`; nunca expor `.message` (interno).
5. **Alertas/monitoramento:** usar `.category` como dimension primária.

### Categorização Mínima (44+ códigos)

| Categoria | Exemplos de códigos | Retryable | Crítico |
|-----------|---------------------|-----------|---------|
| `rate_limit` | 130429, 131048 | sim (com backoff) | não |
| `recipient` | 131051, 131026, 131053, 131030 | não | não |
| `payment` | 131042 | não | sim (alerta imediato) |
| `template` | 132000, 132001, 132005, 132007, 132012, 132015 | não | depende |
| `auth` | 131031, 131005 | não | sim |
| `system` | 131009, 100 | às vezes | às vezes |
| `media` | 131052, 131021 | não | não |

Lista completa mantida em `lib/whatsapp-errors.ts` e espelhada em `arsenal/tecnologia/error-codes-complete.md`.

## Consequências

### Positivas
- Uma única fonte de verdade para mapeamento de códigos.
- Mensagens consistentes para usuário final.
- Update de novos códigos da Meta: editar um só lugar.
- Métricas de erro podem ser agregadas por `.category` com confiança.

### Negativas
- Migração exige varredura de todos os call-sites atuais de `lib/whatsapp/errors.ts`.
- Alguns arquivos podem importar ambos; conflito de tipos precisa ser resolvido.

### Riscos
- Se o migratinon dropa códigos cobertos apenas por `lib/whatsapp/errors.ts` sem checar, podemos perder handling.
  - **Mitigação:** diff de cobertura antes/depois; script que lista códigos cobertos em cada módulo e compara.

## Plano de Implementação

1. Auditar cobertura atual dos dois módulos (script ad-hoc listando códigos tratados).
2. Garantir que `lib/whatsapp-errors.ts` cobre 100% do que `lib/whatsapp/errors.ts` oferece.
3. Adicionar `WhatsAppApiError` como classe no módulo canônico (hoje só tem função `mapWhatsAppError`).
4. Substituir imports de `lib/whatsapp/errors.ts` nos call-sites por imports do canônico.
5. Deletar `lib/whatsapp/errors.ts` OU deixar um re-export `export * from '../whatsapp-errors'` com `@deprecated` JSDoc.
6. Adicionar teste garantindo que `mapWhatsAppError` cobre os top-10 códigos listados em `.claude/CLAUDE.md`.

## Referências

- `.claude/rules/whatsapp-message-patterns.md` (tabela de erros)
- `.claude/CLAUDE.md` (seção "Top 10 Error Codes")
- `arsenal/tecnologia/error-codes-complete.md`
- `docs/plans/2026-04-24-repo-sweep-plan.md` (Fase 1, item H4)
