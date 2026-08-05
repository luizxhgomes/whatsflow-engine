# Guia: Testando Integração WhatsApp

Guia prático para validar envio de mensagens, webhooks, templates e flows.

## Níveis de Teste

| Nível | Ferramenta | Comando | Escopo |
|-------|-----------|---------|--------|
| Unit | Vitest | `npm run test` | Builders, validadores, error mappers |
| Integration | Vitest + MSW | `npm run test:ai:api` | API routes com Meta API mockada |
| E2E local | Playwright | `npm run test:e2e:headed` | Fluxo UI completo no navegador |
| E2E WhatsApp | Vitest scenarios | `npm run test:e2e:whatsapp` | Cenários ponta-a-ponta com Meta sandbox |
| Stress | tsx custom | `npm run test:stress:local` | Webhook sob carga |

## Pré-requisitos

```bash
cd whatsflow
npm install

# Para E2E: Playwright browsers
npx playwright install

# Para testes contra Meta real (sandbox):
# - phone_number_id de test
# - access_token temporário
# - número whitelistado na sandbox
# Variáveis em .env.local (não commit!)
```

## Testes Unitários

### Builders de Mensagem

```typescript
// lib/whatsapp/__tests__/interactive.test.ts
import { buildReplyButtons } from '../interactive'

test('reply buttons: max 3', () => {
  expect(() =>
    buildReplyButtons({
      to: '5511999999999',
      body: 'test',
      buttons: [
        { id: '1', title: 'A' },
        { id: '2', title: 'B' },
        { id: '3', title: 'C' },
        { id: '4', title: 'D' },
      ],
    })
  ).toThrow('Reply buttons support max 3 buttons')
})
```

### Error Mapper

```typescript
import { mapWhatsAppError } from '../whatsapp-errors'

test('error 131042 is payment critical', () => {
  const mapped = mapWhatsAppError(131042)
  expect(mapped.category).toBe('payment')
  expect(mapped.retryable).toBe(false)
})
```

### Phone Formatter

```typescript
import { normalizePhoneNumber, validatePhoneNumber } from '../phone-formatter'

test('E.164 without plus', () => {
  expect(normalizePhoneNumber('+55 (11) 99999-9999')).toBe('5511999999999')
  expect(validatePhoneNumber('5511999999999')).toBe(true)
  expect(validatePhoneNumber('11999999999')).toBe(false) // sem country code
})
```

## Testes de Integração com Meta Mockado

Use MSW (Mock Service Worker) para interceptar chamadas à `graph.facebook.com`:

```typescript
// tests/api-ai/scenarios/send-template.test.ts
import { server } from '../msw-server'
import { http, HttpResponse } from 'msw'

test('send template happy path', async () => {
  server.use(
    http.post('https://graph.facebook.com//:phoneId/messages', () =>
      HttpResponse.json({ messages: [{ id: 'wamid.test123' }] })
    )
  )

  const response = await fetch('/api/messages/template', {
    method: 'POST',
    headers: { 'X-API-Key': process.env.TEST_API_KEY },
    body: JSON.stringify({
      to: '5511999999999',
      templateName: 'welcome',
      language: 'pt_BR',
    }),
  })

  expect(response.status).toBe(200)
  const data = await response.json()
  expect(data.messageId).toBe('wamid.test123')
})
```

### Casos de Erro Obrigatórios

Para cada endpoint que chama Meta, testar:
- [ ] `130429` (rate limit) — deve retornar 429 e agendar retry.
- [ ] `131051` (sem WhatsApp) — deve marcar contato como inválido.
- [ ] `131042` (pagamento) — deve criar alerta em `account_alerts`.
- [ ] `132000` (template param) — deve retornar 400 com mensagem clara.
- [ ] Timeout — deve fail com retry habilitado.

## Webhook Testing

### Payload de Exemplo (Status Update)

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_TEST",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "5511999999999",
          "phone_number_id": "PHONE_ID_TEST"
        },
        "statuses": [{
          "id": "wamid.test123",
          "status": "delivered",
          "timestamp": "1712345678",
          "recipient_id": "5511888888888"
        }]
      }
    }]
  }]
}
```

### Curl Local

```bash
# Gerar assinatura HMAC primeiro (se verificação estiver habilitada)
PAYLOAD='{"object":"whatsapp_business_account",...}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$META_APP_SECRET" | cut -d' ' -f2)

curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

### Validar Dedup

Reenvie o mesmo payload duas vezes consecutivas. Segundo deve:
- Retornar 200 (para Meta não retry).
- Não duplicar registros em `campaign_contacts`.
- Logar `skipped_duplicate` (ou equivalente após ADR-004).

## Templates

### Ciclo Completo

1. **Criar template na Meta** via `POST /{waba_id}/message_templates` ou UI Business Manager.
2. **Sync local:** `POST /api/templates?source=remote` (com auth).
3. **Validar contrato:** `lib/whatsapp/template-contract.ts` deve rejeitar envios com params faltando.
4. **Enviar:** payload usando `template.name` + `template.language.code` + `components`.
5. **Verificar aprovação:** status `APPROVED` em `templates` table.

### Casos Obrigatórios

- [ ] Template `PENDING` → envio retorna erro claro.
- [ ] Template `REJECTED` → envio bloqueado, razão mostrada.
- [ ] Variáveis faltando → erro 400 antes de chamar Meta.
- [ ] Variáveis extras → ignoradas silenciosamente ou erro (definir política).
- [ ] Header com mídia (image/video/document) → `media.id` válido obrigatório.

## WhatsApp Flows

Flows têm endpoint crypto separado (`/api/flows/endpoint`). Testar:

1. **Handshake:** request inicial com RSA-OAEP chega, servidor decifra, responde com screen.
2. **Data exchange:** request subsequente com AES-128-GCM, servidor processa, responde próximo screen.
3. **Error flow:** se servidor falha, Flow fecha gracefulmente do lado Meta.

Ver `lib/whatsapp/flow-endpoint-crypto.ts` e `lib/whatsapp/flow-endpoint-handlers.ts`.

## Stress Test

```bash
npm run test:stress:local
# Envia N webhooks em paralelo para /api/webhook
# Valida: sem duplicatas, sem 5xx, latência < threshold
```

Configurar via `tests/stress/run-stress-test.ts`:
- `concurrency` — número de requests simultâneos.
- `duration` — tempo total.
- `targetRps` — requests per second.

Output: relatório com p50/p95/p99 e contagem de duplicatas detectadas.

## Smoke Manual em Produção

Depois de cada deploy:

1. Enviar template de teste para número interno whitelistado.
2. Conferir delivery status no dashboard (SENT → DELIVERED → READ).
3. Responder a mensagem — conferir webhook inbound.
4. Abrir UI `/dashboard/campaigns` e verificar contadores.
5. Rodar `npm run test:e2e:whatsapp` contra ambiente de staging.

## Troubleshooting

| Sintoma | Hipótese | Verificação |
|---------|----------|-------------|
| Mensagem não entrega | Fora da janela 24h + sem template | Checar último inbound do contato; usar template |
| `130429` frequente | Rate limit tier baixo | `lib/meta-limits.ts`; upgrade de tier |
| Webhook não chega | URL não verificada na Meta | Reverificar no Business Manager |
| Payment alert constante | Saldo/cartão da Meta | Pagar pendência no Business Manager |
| Template aprova mas rejeita envio | Categoria mudou entre aprovação e envio | Re-sync via `/api/templates` |

## Referências

- `arsenal/tecnologia/cloud-api-reference.md`
- `arsenal/tecnologia/message-types.md`
- `.claude/rules/whatsapp-api-reference.md`
- `.claude/rules/whatsapp-message-patterns.md`
- `app/tests/` — exemplos existentes
