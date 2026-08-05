# Contrato com a API oficial (WhatsApp Business Cloud API)

Documento de auditoria do WhatsFlow Engine contra o contrato publicado pela Meta para a
WhatsApp Business Cloud API na versao. Todas as afirmacoes sobre o codigo foram
verificadas por leitura direta dos arquivos citados. Os caminhos sao relativos a raiz do
repositorio.

Data da auditoria: 2026-08-05.
Responsavel tecnico: Cloud API Architect (squad WhatsApp).

---

## 1. Mapa de correspondencias (o que o sistema envia e onde vive)

### 1.1 Camada de builders de payload

Todos os builders produzem o corpo de `POST /{phone_number_id}/messages` e sao reexportados
por `app/lib/whatsapp/index.ts`.

| Correspondencia (tipo Meta) | Builder / funcao | Arquivo | Consumidor real verificado |
| --- | --- | --- | --- |
| `text` | `buildTextMessage` | `app/lib/whatsapp/text.ts` | `app/lib/whatsapp-send.ts`, `app/lib/builder/steps/whatsapp/`, rotas de campanha |
| `template` | `buildTemplatePayload` (privada) | `app/lib/whatsapp-send.ts` linhas 114 a 147 | `sendWhatsAppMessage` com `type: 'template'` |
| `template` (campanha, com header de midia) | `buildMetaTemplatePayload` | `app/app/api/campaign/workflow/route.ts` | fluxo de disparo em massa |
| `interactive.button` (reply buttons) | `buildReplyButtons` | `app/lib/whatsapp/interactive.ts` | `app/lib/builder/steps/whatsapp/send-buttons.ts` |
| `interactive.list` | `buildListMessage` | `app/lib/whatsapp/interactive.ts` | `app/lib/builder/steps/whatsapp/send-buttons.ts` |
| `interactive.cta_url` | `buildCtaUrl` | `app/lib/whatsapp/interactive.ts` | sem consumidor fora da propria pasta (ver Pendencia P-08) |
| `interactive.location_request_message` | `buildLocationRequest` | `app/lib/whatsapp/interactive.ts` | sem consumidor (Pendencia P-08) |
| Menu derivado (botoes ou lista conforme quantidade) | `buildMenu` | `app/lib/whatsapp/interactive.ts` | sem consumidor (Pendencia P-08) |
| `interactive.flow` | `buildFlowMessage` | `app/lib/whatsapp/flows.ts` | `app/app/api/flows/send/route.ts` |
| `interactive.flow` (caminho paralelo) | `sendFlowMessage` | `app/lib/whatsapp-send.ts` linhas 334 a 426 | chamada direta, monta o payload inline |
| `image` | `buildImageMessage` | `app/lib/whatsapp/media.ts` | `app/lib/builder/steps/whatsapp/send-media.ts` |
| `video` | `buildVideoMessage` | `app/lib/whatsapp/media.ts` | `app/lib/builder/steps/whatsapp/send-media.ts` |
| `audio` | `buildAudioMessage` | `app/lib/whatsapp/media.ts` | `app/lib/builder/steps/whatsapp/send-media.ts` |
| `document` | `buildDocumentMessage` | `app/lib/whatsapp/media.ts` | `app/lib/builder/steps/whatsapp/send-media.ts` |
| `sticker` | `buildStickerMessage` | `app/lib/whatsapp/media.ts` | `app/lib/builder/steps/whatsapp/send-media.ts` |
| `location` | `buildLocationMessage` | `app/lib/whatsapp/media.ts` | sem consumidor (Pendencia P-08) |
| `reaction` | `buildReactionMessage` e `sendReaction` | `app/lib/whatsapp/media.ts`, `app/lib/whatsapp-send.ts` linhas 251 a 301 | `sendReaction` e o caminho vivo |
| Carrossel de midia | `buildCarouselMessage` | `app/lib/whatsapp/media.ts` linhas 299 a 350 | sem consumidor; o proprio comentario do arquivo declara a estrutura como simplificada (Pendencia P-06) |
| `status: read` (marcar como lida) | `buildMarkAsRead`, `sendMarkAsRead` | `app/lib/whatsapp/status.ts` | sem consumidor fora da pasta (Pendencia P-08) |
| Indicador de digitacao | `sendTypingIndicator` | `app/lib/whatsapp-send.ts` linhas 181 a 223 | `app/app/api/ai/respond/route.ts` |
| Indicador de digitacao (payload invalido) | `buildTypingIndicator` | `app/lib/whatsapp/status.ts` linhas 26 a 42 | marcado como `@deprecated` no proprio arquivo; produz `type: 'typing'`, que a Cloud API nao aceita |

Observacao verificada: o caminho correto de digitacao esta em `app/lib/whatsapp-send.ts`,
que envia `status: 'read'` junto de `typing_indicator: { type: 'text' }`, conforme o contrato
da Meta, que exige o `message_id` de uma mensagem recebida.

### 1.2 Camada de transporte

| Funcao | Arquivo | Timeout | Observacao |
| --- | --- | --- | --- |
| `sendWhatsAppMessage` | `app/lib/whatsapp-send.ts` linha 71 | 8000 ms | endpoint `graph.facebook.com//{phone_number_id}/messages` |
| `sendTypingIndicator` | `app/lib/whatsapp-send.ts` linha 190 | 5000 ms | idem |
| `sendReaction` | `app/lib/whatsapp-send.ts` linha 266 | 5000 ms | idem |
| `sendFlowMessage` | `app/lib/whatsapp-send.ts` linha 389 | 8000 ms | idem |
| `sendWhatsAppPayload` | `app/lib/builder/steps/whatsapp/shared.ts` linha 66 | 8000 ms | transporte unico dos steps do builder |
| `sendMarkAsRead` | `app/lib/whatsapp/status.ts` linha 95 | 10000 ms via `AbortController` | caminho nao consumido |
| Disparo de campanha | `app/app/api/campaign/workflow/route.ts` linhas 1529 e seguintes | fetch direto | inclui retry pontual apos refresh de template e apos rehost de midia |

Normalizacao de destinatario: `normalizePhoneNumber` (`app/lib/phone-formatter.ts`) seguida de
validacao `^\+\d{8,15}$` em `app/lib/whatsapp-send.ts` linha 49 e em
`app/lib/builder/steps/whatsapp/shared.ts` linha 33. O formato exigido pela Meta e o E.164.

### 1.3 Gestao de templates e midia

| Operacao | Endpoint Graph | Arquivo |
| --- | --- | --- |
| Criacao de template | `POST //{waba_id}/message_templates` | `app/lib/whatsapp/template.service.ts` linha 25 |
| Listagem de templates | `GET //{waba_id}/message_templates` | `app/app/api/campaign/workflow/route.ts` linha 223 |
| Upload de midia de campanha | `POST //{phone_number_id}/media` | `app/app/api/campaign/workflow/route.ts` linha 726 |
| Upload de header de template (Resumable Upload API, duas etapas) | `POST //{app_id}/uploads` e `POST //upload:{session_id}` | `app/app/api/meta/uploads/template-header/route.ts` linhas 175 e 218 |
| Contrato e validacao de template | `app/lib/whatsapp/template-contract.ts`, `app/lib/whatsapp/validators/template.schema.ts` | mesmos arquivos |
| Flows (criacao e gestao) | base `https://graph.facebook.com/` | `app/lib/meta-flows-api.ts` linhas 4 e 5 |

### 1.4 Rotas de webhook e de administracao Meta

| Rota | Arquivo | Papel |
| --- | --- | --- |
| `GET /api/webhook` | `app/app/api/webhook/route.ts` linhas 567 a 594 | handshake `hub.mode`, `hub.verify_token`, `hub.challenge`; devolve o challenge com 200 ou 403 |
| `POST /api/webhook` | `app/app/api/webhook/route.ts` | validacao HMAC, statuses, mensagens de entrada, submissoes de Flow, opt-out por palavra-chave; responde sempre 200 no final (linha 1730) |
| `GET /api/webhook/info` | `app/app/api/webhook/info/route.ts` | expoe URL de callback e verify token calculados |
| `GET /api/webhook/validate` | `app/app/api/webhook/validate/route.ts` | heuristica de saude: considera saudavel se houve evento nas ultimas 24 horas |
| `POST /api/webhook/reconcile-status-events` | `app/app/api/webhook/reconcile-status-events/route.ts` | reconciliacao de eventos de status pendentes, protegida por chave administrativa |
| `/api/meta/diagnostics` | `app/app/api/meta/diagnostics/route.ts` | diagnostico de credenciais, subscription e bloqueios (constante `META_BUSINESS_LOCKED_CODE = 131031`) |
| `/api/meta/diagnostics/simulate-10033` | `app/app/api/meta/diagnostics/simulate-10033/route.ts` | simulacao controlada de erro para verificar o mapeamento |
| `/api/meta/webhooks/subscription` | `app/app/api/meta/webhooks/subscription/route.ts` | leitura e ajuste de `subscribed_apps` e `override_callback_uri` |
| `/api/meta/uploads/template-header` | `app/app/api/meta/uploads/template-header/route.ts` | upload de header de template com limite de 4,5 MB por restricao de serverless |

Assinatura do webhook: `app/app/api/webhook/route.ts` linhas 168 a 187 le
`x-hub-signature-256`, recalcula o HMAC SHA-256 sobre o corpo cru e compara com
`timingSafeEqual`. Sem segredo configurado, a rota registra erro critico e recusa o evento,
com excecao de um modo explicito de bypass em desenvolvimento.

Deduplicacao: `app/lib/whatsapp-webhook-dedupe.ts` via `shouldProcessWhatsAppStatusEvent`,
com registro e reconciliacao em `app/lib/whatsapp-status-events.ts`.

Criptografia do endpoint de Flows: `app/lib/whatsapp/flow-endpoint-crypto.ts` implementa
AES-128-GCM com chave simetrica protegida por RSA OAEP SHA-256, conforme o contrato de
Flows Data Endpoint.

---

## 2. Janela de 24 horas (customer service window)

### 2.1 A regra da Meta

A janela de atendimento abre a cada mensagem recebida do usuario e dura 24 horas. Dentro dela
o numero pode enviar mensagens livres de qualquer tipo suportado. Fora dela, apenas templates
aprovados (HSM) sao aceitos; qualquer mensagem livre e recusada com codigo de reengajamento.

### 2.2 O que o codigo faz hoje

Verificacao realizada por busca em `app/lib` e `app/app` pelos termos de janela, ultimo inbound
e expiracao de sessao. Resultado:

1. Nao existe verificacao preventiva da janela antes do envio. Em
   `app/lib/inbox/inbox-service.ts` linhas 134 a 153, a escolha entre `text` e `template`
   depende exclusivamente do argumento `messageType` recebido de quem chama, sem consultar o
   horario da ultima mensagem recebida do contato.
2. `app/lib/whatsapp-send.ts` aceita `type: 'text' | 'template'` e nao consulta estado de
   conversa em nenhum ponto.
3. A tabela de conversas mantem `last_message_at` (`app/lib/inbox/inbox-db.ts` linhas 107, 249,
   300 e 639), porem esse campo e usado apenas para ordenacao das listagens e e atualizado
   tanto por mensagens de entrada quanto de saida. Ele nao serve, no estado atual, como marco
   de abertura da janela.
4. O tratamento da janela e portanto reativo: o sistema descobre que estava fora da janela
   somente quando a Meta devolve o erro, tratado no webhook em
   `app/app/api/webhook/route.ts` linhas 866 a 975.

### 2.3 Como o sistema reage quando a Meta recusa por janela

Os codigos de janela estao mapeados em `app/lib/whatsapp-errors.ts`:

- `131047` (Re-engagement message required), linhas 180 a 187, com mensagem
  "Fora da janela de 24h. Necessario usar template." e `retryable: false`.
- `470` (Outside support window for freeform messages), linhas 204 a 211, com orientacao para
  usar um template aprovado e `retryable: false`.

O webhook grava o codigo, a razao amigavel e a acao recomendada em `campaign_contacts`
(`failure_code`, `failure_reason`, `failure_title`, `failure_details`, `failure_href`) e
avalia auto supressao via `maybeAutoSuppressByFailure`.

### 2.4 Categorias e custo

`app/lib/whatsapp-pricing.ts` modela categorias `MARKETING`, `UTILITY` e `AUTHENTICATION`
com faixas de volume, o que e coerente com o modelo de cobranca por mensagem de template.
Nao ha, no codigo, modelagem de conversa de servico gratuita dentro da janela.

---

## 3. Codigos de erro da Graph API e tratamento existente

Fonte canonica do mapeamento: `app/lib/whatsapp-errors.ts` (dicionario `WHATSAPP_ERRORS` e
funcoes auxiliares `mapWhatsAppError`, `isRetryableError`, `isCriticalError`, `isOptOutError`,
`getUserFriendlyMessageForMetaError`, `getRecommendedActionForMetaError`).
Existe ainda um mapeamento paralelo e menor em `app/lib/whatsapp/errors.ts`, marcado como
`@deprecated`, usado somente pelo servico de criacao de templates.

| Codigo | Significado | Categoria no codigo | Retentavel | Tratamento verificado |
| --- | --- | --- | --- | --- |
| 130429 | Rate limit de throughput da Cloud API | `rate_limit` | sim | unico codigo com laco de realimentacao real: `app/app/api/campaign/workflow/route.ts` linha 1912 chama `recordThroughputExceeded` e reduz o alvo de mensagens por segundo em `app/lib/whatsapp-adaptive-throttle.ts` |
| 130472 | Numero do usuario faz parte de experimento da Meta | `recipient` | sim | apenas mapeado em `app/lib/whatsapp-errors.ts` linhas 652 a 659; nao ha retentativa dedicada |
| 131048 | Spam rate limit | `rate_limit` | sim | apenas mapeado, linhas 76 a 83; acao textual sugere reduzir frequencia, sem enforcement |
| 131049 | Nao entregue para preservar o ecossistema | `rate_limit` | sim | apenas mapeado, linhas 284 a 291 |
| 131056 | Pair rate limit (mesmo destinatario) | `rate_limit` | sim | mapeado nas linhas 68 a 75; helpers `isPairRateLimitError` e `getPairRateLimitWait` existem em `app/lib/errors.ts` linhas 378 e 389, mas a busca no repositorio mostra consumo somente em `app/lib/errors.test.ts` |
| 131047 | Reengajamento necessario (fora da janela) | `recipient` | nao | mapeado; persistido pelo webhook |
| 470 | Fora da janela para mensagem livre | `recipient` | nao | mapeado; persistido pelo webhook |
| 368 | Bloqueio temporario por violacao de politica | `integrity` | nao | mapeado em `app/lib/whatsapp-errors.ts` linhas 412 a 419 e tambem em `app/lib/whatsapp/errors.ts` linha 48 (mensagem especifica de spam na criacao de template) |
| 80007 | Rate limit da Cloud API | `rate_limit` | sim | mapeado nas linhas 392 a 399 e tratado em `app/lib/whatsapp/errors.ts` linha 83 no fluxo de templates |
| 133016 | Taxa de envio nao conforme | `rate_limit` | sim | apenas mapeado |
| 131042 | Pendencia de pagamento | `payment` | nao | mapeado; entra na trilha de alerta se listado em `CRITICAL_ERROR_CODES` |
| 130497 | Conta comercial bloqueada | `integrity` | nao | mapeado |
| 131031 | Conta bloqueada (diagnostico) | tratado a parte | nao | constante `META_BUSINESS_LOCKED_CODE` em `app/app/api/meta/diagnostics/route.ts` linha 15 |
| 131050, 134102, 1752041 | Opt out e inelegibilidade de marketing | `recipient` e `template` | nao | roteados por `isOptOutError` para `markContactOptOutAndSuppress` no webhook, linhas 948 e seguintes |
| 132000 a 132016 | Familia de erros de template (parametros, tamanho, pausa, desativacao) | `template` | nao | mapeados; a rota de campanha ainda faz um refresh de template e uma unica retentativa quando o erro sugere header de midia invalido |
| 132068, 132069 | Flow bloqueado e Flow com throttle | `template` | nao e sim | apenas mapeados |
| 190, 200, 10, 131005 | Autenticacao e permissao | `auth` | nao | mapeados; `app/lib/whatsapp/errors.ts` produz mensagem dedicada para 190 e 200 no fluxo de templates |
| 100 com subcodigos 2388005, 2388024, 2388043, 2388299 | Erros estruturais de template | `auth` no canonico, tratados por subcodigo no legado | nao | `app/lib/whatsapp/errors.ts` linhas 53 a 75 |

Fluxo de tratamento no webhook, verificado em `app/app/api/webhook/route.ts`:
extrai `errors[0]`, resolve `code`, `title`, `message` e `error_data.details`, chama
`mapWhatsAppError`, monta mensagem amigavel e acao recomendada, marca o contato como `failed`,
incrementa estatistica da campanha via RPC `increment_campaign_stat`, cria alerta em
`account_alerts` quando `isCriticalError`, aplica opt out quando `isOptOutError` e tenta
auto supressao. Eventos nao correlacionados a um contato sao marcados como `unmatched` e
enfileirados para reconciliacao.

---

## 4. Pendencias

Cada item abaixo e uma lacuna verificada por leitura de codigo, nao uma suposicao.

**Pendencia P-01. Janela de 24 horas sem verificacao preventiva.**
Nenhum caminho de envio consulta o horario da ultima mensagem recebida antes de mandar texto
livre. O sistema so descobre a violacao pelo erro 131047 ou 470. Impacto: falhas evitaveis,
poluicao de metricas de campanha e risco de degradacao de qualidade do numero. Correcao
sugerida: persistir `last_inbound_at` por contato e bloquear ou converter para template em
`app/lib/whatsapp-send.ts` e em `app/lib/inbox/inbox-service.ts`.

**Pendencia P-02. Pair rate limit (131056) nao aplicado.**
`isPairRateLimitError` e `getPairRateLimitWait` existem em `app/lib/errors.ts` mas so sao
usados nos testes. Nao ha espera de 6 segundos por destinatario em nenhum caminho de envio.

**Pendencia P-03. Backoff restrito ao codigo 130429.**
O throttle adaptativo em `app/lib/whatsapp-adaptive-throttle.ts` so reage a 130429. Os codigos
131048, 131049, 133016, 80007 e 4 estao marcados como `retryable: true` no dicionario, porem
nenhum consumidor le `isRetryableError` para programar retentativa ou reduzir pressao.

**Pendencia P-04. Cabecalho de limite da Graph API ignorado.**
Nao ha leitura de cabecalhos de uso e limite retornados pela Graph API em nenhum dos
transportes (`app/lib/whatsapp-send.ts`, `app/lib/builder/steps/whatsapp/shared.ts`,
`app/app/api/campaign/workflow/route.ts`). O controle de ritmo e inteiramente inferido.

**Pendencia P-05. Versao da API fixada em literal e com um ponto divergente.**
Foram encontradas 42 ocorrencias de `graph.facebook.com/` e uma ocorrencia de
`graph.facebook.com/v21.0`, em `app/app/api/webhook/route.ts` linha 1684, no envio de
confirmacao de submissao de Flow. Nao existe constante unica de versao no projeto, apenas
`GRAPH_VERSION` local em `app/lib/meta-flows-api.ts` e `META_API_VERSION` local nas rotas
`app/app/api/meta/`. Correcao sugerida: constante unica compartilhada.

**Pendencia P-06. Carrossel com estrutura declaradamente simplificada.**
`buildCarouselMessage` em `app/lib/whatsapp/media.ts` documenta no proprio corpo que a
estrutura real da API e mais complexa e provavelmente exige abordagem por template. A funcao
nao possui consumidor. Enviar esse payload como esta tende a ser rejeitado.

**Pendencia P-07. Builder de digitacao invalido ainda exportado.**
`buildTypingIndicator` em `app/lib/whatsapp/status.ts` gera `type: 'typing'`, que nao existe
no contrato. Esta marcado como `@deprecated` porem continua exportado por
`app/lib/whatsapp/index.ts`, o que mantem o risco de uso acidental.

**Pendencia P-08. Correspondencias construidas e nunca enviadas.**
Sem consumidor fora da propria pasta: `buildCtaUrl`, `buildLocationRequest`, `buildMenu`,
`buildLocationMessage`, `buildReactionMessage`, `buildMarkAsRead` e `sendMarkAsRead`. Sao
capacidades declaradas mas nao exercidas em producao, portanto nao validadas contra a Meta.

**Pendencia P-09. Template de saida com idioma fixo.**
`buildTemplatePayload` em `app/lib/whatsapp-send.ts` linha 143 fixa
`language: { code: 'pt_BR' }`. Qualquer template aprovado em outro idioma falhara com erro da
familia 132001. Nao ha parametro de idioma na interface `SendWhatsAppMessageOptions`.

**Pendencia P-10. Ordem de componentes do template.**
Ainda em `buildTemplatePayload`, o componente `body` e adicionado antes do `header`
(linhas 122 a 135). A Meta aceita a lista de componentes, mas a ordem invertida dificulta
depuracao e diverge do contrato documentado. Vale normalizar para header, body e buttons.

**Pendencia P-11. Dois mapeamentos de erro coexistindo.**
`app/lib/whatsapp/errors.ts` permanece como fonte paralela para o servico de templates,
enquanto `app/lib/whatsapp-errors.ts` e o canonico. O plano de consolidacao esta citado no
proprio cabecalho do arquivo legado, referenciando ADR-002. Enquanto durar a duplicidade, um
codigo pode receber tratamentos diferentes dependendo do caminho.

**Pendencia P-12. Mensagens de erro com emoji embutido.**
As strings de `app/lib/whatsapp/errors.ts` carregam emojis dentro da mensagem tecnica
retornada. Isso mistura camada de apresentacao com camada de contrato e prejudica logs e
comparacoes automatizadas.

**Pendencia P-13. Cobertura de tipos de entrada.**
`extractInboundText` em `app/app/api/webhook/route.ts` linhas 190 a 205 cobre `text`, `button`,
`interactive.button_reply` e `interactive.list_reply`. Nao extrai conteudo de `order`,
`contacts`, `system`, `referral` nem `reaction`. Mensagens desses tipos chegam ao inbox sem
texto util, o que compromete roteamento por palavra-chave.

**Pendencia P-14. Confirmacao de Flow sem tratamento de erro.**
O envio de confirmacao apos a submissao de Flow, em `app/app/api/webhook/route.ts` linha 1684,
usa `fetch` sem timeout, sem verificacao de `response.ok` e dentro de um `catch` vazio. Falhas
silenciosas nesse ponto sao invisiveis na operacao.

---

## 5. Resumo de conformidade

| Eixo | Situacao |
| --- | --- |
| Versionamento da API | Conforme em 42 chamadas na, com um desvio residual na v21.0 e sem constante unica |
| Tipos de mensagem | Builders cobrem o essencial do contrato; parte deles nunca exercida e o carrossel esta incompleto |
| Janela de 24 horas | Tratamento apenas reativo, sem guarda preventiva |
| Templates HSM | Criacao, validacao e envio implementados; idioma de saida fixado em pt_BR |
| Erros da Graph API | Dicionario amplo e bem categorizado; consumo operacional concentrado em 130429 e nos codigos criticos e de opt out |
| Seguranca do webhook | HMAC SHA-256 com comparacao em tempo constante, handshake de verificacao e deduplicacao implementados |
