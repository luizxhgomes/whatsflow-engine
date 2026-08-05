# Garantias anti-bloqueio: playbook preventivo para disparo em massa

Documento operacional do WhatsFlow Engine. Objetivo: reduzir a probabilidade de rebaixamento de qualidade, pausa de template ou bloqueio de número pela Meta em campanhas de alto volume via API Oficial (Cloud API), e manter a operação aderente à LGPD.

Toda afirmação sobre mecanismo do sistema cita o arquivo real onde o mecanismo vive. O que ainda não existe no código está isolado na seção "Pendências" e não deve ser tratado como garantia.

Escopo: campanhas iniciadas pelo negócio (template message). Conversas dentro da janela de 24 horas seguem regras próprias e não são objeto deste playbook.

---

## Camada A. Antes do disparo

### A1. Opt-in obrigatório

A política da Meta exige consentimento prévio, explícito e rastreável do destinatário, obtido fora do WhatsApp ou em canal equivalente, com identificação clara do negócio que vai enviar e do tipo de conteúdo.

Regras operacionais:

1. Nenhuma lista comprada, raspada ou herdada de terceiro entra em campanha.
2. O consentimento precisa ter prova: origem (formulário, checkout, checkbox), data e texto exibido no momento do aceite.
3. Consentimento para uma finalidade não autoriza outra finalidade. Aceite para "avisos de pedido" não cobre "promoções".

Como o sistema trata hoje:

- O modelo de contato tem estado de consentimento em `app/types/contact.types.ts` (enum `ContactStatus`, com `OPT_IN`, `OPT_OUT` e `SUPPRESSED`).
- A validação de entrada de contato via API assume `OPT_IN` como padrão quando o campo não é enviado: `app/lib/api-validation.ts`.
- A importação de contatos por arquivo grava todos os registros como `ContactStatus.OPT_IN` de forma fixa, sem coletar nem exigir prova de consentimento: `app/app/api/contacts/import/route.ts` (o campo `status` é atribuído no mapeamento do lote). O parser de arquivo fica em `app/lib/csv-parser.ts`.

Consequência prática: o opt-in é hoje uma declaração do operador, não um dado auditável dentro do sistema. Ver Pendências P1.

### A2. Higiene de lista

Antes de qualquer campanha, a lista precisa passar por quatro cortes:

1. Normalização para E.164. Implementado em `app/lib/phone-formatter.ts` (função `normalizePhoneNumber`), aplicado no disparo em `app/app/api/campaign/dispatch/route.ts`.
2. Deduplicação de destinatários dentro do mesmo lote. O disparo trabalha sobre uma lista deduplicada antes de montar os contatos válidos (`app/app/api/campaign/dispatch/route.ts`).
3. Remoção de opt-out e supressões. O disparo consulta `phone_suppressions` via `getActiveSuppressionsByPhone` (`app/lib/phone-suppressions.ts`) e descarta contatos com `ContactStatus.OPT_OUT`, registrando o motivo do descarte. O mesmo filtro existe no motor de workflow: `app/app/api/campaign/workflow/route.ts`.
4. Remoção de números comprovadamente inválidos. O sistema suprime automaticamente números que retornam falha de entrega recorrente pelo código 131026, com janela e TTL configuráveis: `app/lib/auto-suppression.ts` (config `auto_suppression_config`, padrão janela de 30 dias, limiar 1 ocorrência, TTL de 90, 180 e 365 dias conforme reincidência).

Regra de bolso: taxa de falha estrutural (número inexistente, código 131026) acima de 3 por cento em um envio indica lista suja. Pare, limpe e só então retome.

### A3. Aquecimento de número

Número novo, ou número que voltou de rebaixamento, não recebe carga cheia. Rampa recomendada, sempre com número verificado e perfil de negócio completo:

| Dia | Destinatários únicos | Observação |
|---|---|---|
| 1 a 2 | até 50 | apenas contatos com engajamento recente e alta probabilidade de resposta |
| 3 a 5 | até 150 | manter conteúdo utilitário, sem oferta agressiva |
| 6 a 10 | até 250 (teto do tier inicial) | avaliar qualidade diariamente |
| 11 em diante | subir apenas se qualidade permanecer verde | seguir a política de tier em A4 |

O aquecimento não é apenas volume: a Meta pondera respostas recebidas. Priorizar templates que provocam resposta legítima acelera a subida de tier mais do que volume bruto.

Estado no sistema: não existe funcionalidade de aquecimento automatizado ou trava de rampa por idade do número. A rampa é responsabilidade do operador. Ver Pendências P2.

### A4. Tiers de mensageria e como subir

Os tiers limitam destinatários únicos iniciados pelo negócio em janela móvel de 24 horas. O sistema modela os tiers em `app/lib/meta-limits.ts`:

| Tier | Limite por 24h | Constante no código |
|---|---|---|
| Iniciante | 250 | `TIER_250` |
| Básico | 1.000 | `TIER_1K` |
| Verificado | 2.000 | `TIER_2K` |
| Crescimento | 10.000 | `TIER_10K` |
| Escala | 100.000 | `TIER_100K` |
| Ilimitado | sem teto | `TIER_UNLIMITED` |

Além do tier, existe o limite de vazão (throughput), também em `app/lib/meta-limits.ts`: `STANDARD` igual a 80 mensagens por segundo e `HIGH` igual a 1.000 mensagens por segundo. Tier e throughput são limites diferentes e independentes: estourar o throughput devolve erro 130429, estourar o tier bloqueia novas conversas no dia.

Como subir de tier, conforme o roteiro implementado em `getUpgradeRoadmap` (`app/lib/meta-limits.ts`):

1. Saindo do tier de 250: concluir a verificação de empresa no Meta Business Suite, ou entregar 2.000 mensagens para usuários únicos em 30 dias mantendo qualidade alta. Em ambos os casos, a qualidade precisa estar verde ou amarela.
2. De 2.000 para 10.000, de 10.000 para 100.000 e de 100.000 para ilimitado: usar pelo menos 50 por cento do limite atual nos últimos 7 dias e manter qualidade verde ou amarela. O aumento é automático pela Meta, tipicamente em até 6 horas após os critérios serem atingidos.

Trava preventiva no sistema: `validateCampaign` (`app/lib/meta-limits.ts`) bloqueia o envio quando a quantidade de destinatários excede o limite diário do tier ou a cota restante do dia, devolve o motivo do bloqueio e o roteiro de upgrade. Também emite avisos quando a qualidade está amarela ou vermelha, quando a campanha passa de 5.000 contatos em throughput padrão e quando a campanha consome mais de 80 por cento do limite diário.

Atenção: o aviso de qualidade vermelha em `validateCampaign` é apenas aviso, não bloqueio. Ver Pendências P3.

### A5. Qualidade do template antes de submeter

1. Categoria correta. Marketing, Utility e Authentication têm regras e custos distintos. A Meta reclassifica templates por conta própria e o sistema registra o evento com alerta de impacto de custo: `handleTemplateCategoryUpdate` em `app/lib/webhook-event-handlers.ts`.
2. Variáveis sempre preenchíveis. O pré-check por contato roda antes do envio e descarta contatos com variáveis não resolvidas, evitando erro de parâmetro em massa: `precheckContactForTemplate`, usado em `app/app/api/campaign/dispatch/route.ts`. O contrato de template vive em `app/lib/whatsapp/template-contract.ts` e a substituição de variáveis em `app/lib/whatsapp/placeholder.ts`.
3. Somente template aprovado. O status vindo da Meta é persistido na tabela `templates` pelo webhook (`app/app/api/webhook/route.ts`, bloco de `message_template_status_update`), incluindo normalização de `DISABLED` para `REJECTED` e gravação de `rejected_reason`.

---

## Camada B. Durante o disparo

### B1. Throttling adaptativo

O sistema implementa um controlador AIMD de mensagens por segundo por número, em `app/lib/whatsapp-adaptive-throttle.ts`. Ele aumenta a taxa de forma aditiva quando os lotes ficam estáveis e reduz de forma multiplicativa quando a Meta devolve o erro 130429 (throughput excedido).

Variáveis de ambiente reais lidas pelo controlador (`configFromEnv` em `app/lib/whatsapp-adaptive-throttle.ts`, expostas também em `app/app/api/settings/whatsapp-throttle/route.ts`):

| Variável | Padrão no código | Função |
|---|---|---|
| `WHATSAPP_ADAPTIVE_THROTTLE` | ligado por padrão quando ausente; `1` liga explicitamente | liga ou desliga o controle adaptativo |
| `WHATSAPP_ADAPTIVE_START_MPS` | 20 (rota de settings usa 30) | taxa inicial em mensagens por segundo |
| `WHATSAPP_ADAPTIVE_MAX_MPS` | 80 | teto de mensagens por segundo |
| `WHATSAPP_ADAPTIVE_MIN_MPS` | 5 | piso de mensagens por segundo após reduções |
| `WHATSAPP_ADAPTIVE_COOLDOWN_SEC` | 30 | pausa após detectar 130429 |
| `WHATSAPP_ADAPTIVE_MIN_INCREASE_GAP_SEC` | 10 | intervalo mínimo entre dois aumentos de taxa |
| `WHATSAPP_SEND_CONCURRENCY` | 2 | envios simultâneos |
| `WHATSAPP_WORKFLOW_BATCH_SIZE` | 40 | tamanho do lote processado por ciclo |
| `WHATSAPP_SEND_FLOOR_DELAY_MS` | 0 | atraso mínimo forçado entre envios |

Comportamento verificado no código:

- Aumento: passo aditivo de 5 por cento do alvo atual, com mínimo de 1, respeitando `WHATSAPP_ADAPTIVE_MAX_MPS` (`recordStableBatch`).
- Redução: multiplicação do alvo por 0,6, respeitando `WHATSAPP_ADAPTIVE_MIN_MPS`, mais aplicação imediata de cooldown (`recordThroughputExceeded`).
- O estado por número é persistido na tabela `settings` sob a chave `whatsapp_adaptive_mps_state:<phone_number_id>`, o que mantém o controle coerente em ambiente serverless.
- O acionamento acontece no motor de campanha: `app/app/api/campaign/workflow/route.ts` chama `recordThroughputExceeded` ao detectar código 130429 e `recordStableBatch` ao fechar um lote sem 130429.

Limite importante: o gatilho do controlador é o erro 130429, e não o quality rating. Ver Pendências P4.

### B2. Pausa automática

- Pausa por cooldown: após um 130429, o controlador grava `cooldownUntil` e bloqueia aumentos de taxa até o prazo expirar (`app/lib/whatsapp-adaptive-throttle.ts`).
- Pausa manual da campanha: o motor verifica o estado de pausa uma vez por lote e interrompe o processamento do lote quando a campanha está pausada (`app/app/api/campaign/workflow/route.ts`).

Não existe hoje pausa automática de campanha disparada por queda de qualidade ou por pico de falhas. Ver Pendências P3.

### B3. Monitoramento de template pausado ou desabilitado pela Meta

O webhook assina e trata os eventos relevantes em `app/app/api/webhook/route.ts`, delegando para `app/lib/webhook-event-handlers.ts`:

| Evento da Meta | Handler | Efeito no sistema |
|---|---|---|
| `message_template_status_update` | tratado direto em `app/app/api/webhook/route.ts` | atualiza `templates.status`, grava `rejected_reason`, normaliza `DISABLED` para `REJECTED` |
| `message_template_quality_update` | `handleTemplateQualityUpdate` | grava `templates.quality_score` e cria alerta em `account_alerts` para amarelo e vermelho |
| `template_category_update` | `handleTemplateCategoryUpdate` | atualiza a categoria e alerta sobre impacto de custo |
| `message_template_components_update` | `handleTemplateComponentsUpdate` | apenas registro em log |
| `phone_number_quality_update` | `handlePhoneNumberQualityUpdate` | cria alerta quando o número é sinalizado (evento `FLAGGED`), incluindo o limite atual informado pela Meta |

A coluna `quality_score` na tabela `templates` e a tabela `webhook_events` foram criadas na migration `app/supabase/migrations/20260319000004_add_webhook_events_and_template_quality.sql`. Todos os eventos recebidos são gravados em `webhook_events` (campos `event_type`, `field`, `waba_id`, `payload`, `processed`, `error`), o que dá trilha de auditoria completa do que a Meta comunicou e quando.

Deduplicação: eventos de status de mensagem passam por dedupe antes de tocar o banco, com chave `wa:status:dedupe:<messageId>:<status>` e TTL padrão de 7 dias, configurável por `WHATSAPP_STATUS_DEDUPE_TTL_SECONDS` (`app/lib/whatsapp-webhook-dedupe.ts`). O comportamento é fail-open: se o Redis estiver ausente ou falhar, o evento é processado normalmente.

---

## Camada C. Depois do disparo

### C1. Leitura de métricas por mensagem

Os estados possíveis por mensagem são `sent`, `delivered`, `read` e `failed` (`app/lib/whatsapp-status-events.ts`). A transição é monotônica: um status só avança na ordem `pending`, `sent`, `delivered`, `read`, com exceção de `failed`, que sempre é aplicado. Os carimbos `delivered_at` e `read_at` são gravados e os contadores agregados da campanha são incrementados por RPC.

Indicadores a ler ao fim de cada campanha, em ordem de gravidade:

1. Taxa de entrega (`delivered` sobre `sent`). Abaixo de 90 por cento indica lista suja ou número sob restrição.
2. Taxa de leitura (`read` sobre `delivered`). Queda abrupta em relação à campanha anterior antecede rebaixamento de qualidade.
3. Taxa de falha por código. O catálogo de erros e a interpretação por código vivem em `app/lib/whatsapp-errors.ts`. Códigos críticos: 130429 (throughput), 131026 (número não recebe mensagem) e os códigos de bloqueio por opt-out tratados no webhook.
4. Presença de 130429 na execução. A interface de detalhe de campanha já sinaliza esse diagnóstico (`app/components/features/campaigns/details/utils.ts`).
5. Alertas gerados em `account_alerts` durante e após a janela de envio.

Regra: nenhuma campanha nova sobe enquanto os indicadores da anterior não forem lidos.

### C2. Tratamento de opt-out imediato

Fluxo implementado em `app/app/api/webhook/route.ts`:

1. Detecção por palavra-chave em mensagem recebida, com normalização de acentos e casamento por inclusão de frase. A lista atual cobre: parar, pare, stop, cancelar, cancele, sair, remover, remove, descadastrar, desinscrever, unsubscribe, optout, opt-out, "nao quero", "nao receber". A função é `isOptOutKeyword`.
2. Detecção por sinal da própria Meta, quando o erro de envio indica bloqueio do usuário; nesse caso a supressão é gravada com `source` igual a `meta_opt_out_error`.
3. Gravação em `phone_suppressions` via `markContactOptOutAndSuppress`, que chama `upsertPhoneSuppression` (`app/lib/phone-suppressions.ts`), com telefone normalizado, motivo, origem e `is_active` verdadeiro. O campo `contacts.status` não é alterado por esse fluxo, por decisão explícita: o status do contato permanece sob controle manual do operador e a supressão é a fonte de verdade para bloqueio automático.
4. Efeito imediato no próximo disparo: `getActiveSuppressionsByPhone` filtra os destinatários em `app/app/api/campaign/dispatch/route.ts` e em `app/app/api/campaign/workflow/route.ts`.
5. Visibilidade: a listagem de contatos calcula um status efetivo em que `SUPPRESSED` tem prioridade sobre o status gravado (`app/app/(dashboard)/contacts/actions.ts`).

A tabela `phone_suppressions` está definida em `app/supabase/migrations/00000000000000_init.sql`, com unicidade por `phone`, RLS habilitado, revogação de acesso para os papéis `anon` e `authenticated`, e índices para `phone`, `is_active` e `expires_at`. A expiração é respeitada em tempo de leitura por `isSuppressionActive` (`app/lib/phone-suppressions.ts`).

### C3. O que fazer se a qualidade cair

Qualidade amarela (aviso, janela de correção):

1. Suspender campanhas de marketing por 48 horas, mantendo apenas mensagens utilitárias e conversas em janela aberta.
2. Identificar o template responsável pelo alerta em `account_alerts` e pausar seu uso.
3. Reduzir o teto de vazão baixando `WHATSAPP_ADAPTIVE_MAX_MPS` e elevando `WHATSAPP_ADAPTIVE_COOLDOWN_SEC`.
4. Recortar a lista para contatos com engajamento nos últimos 30 dias.

Qualidade vermelha (risco de pausa de template e rebaixamento de tier):

1. Parar todo disparo em massa imediatamente. Não é redução, é parada.
2. Tratar o template como queimado: reescrever conteúdo e submeter novo template em vez de reutilizar o rebaixado.
3. Suprimir toda a base que não teve interação nos últimos 90 dias antes de qualquer retomada.
4. Retomar em regime de aquecimento (Camada A3), a partir de 50 destinatários por dia, com conteúdo utilitário.
5. Se o evento `phone_number_quality_update` chegou com `FLAGGED`, considerar o número em observação pela Meta por pelo menos 7 dias e não tentar recuperar tier nesse período.

Referência dos alertas e das ações sugeridas: `app/lib/webhook-event-handlers.ts`.

---

## Camada D. LGPD

### D1. Base legal

Comunicação comercial ativa por WhatsApp deve se apoiar em consentimento (artigo 7, inciso I da Lei 13.709/2018), coletado de forma livre, informada e inequívoca para a finalidade específica de contato por WhatsApp. Legítimo interesse não é base adequada para marketing ativo em canal pessoal, e execução de contrato só cobre mensagens estritamente transacionais relativas ao contrato existente.

Consequência operacional: a prova de consentimento precisa existir fora ou dentro do sistema, com data, canal e texto do aceite, e precisa sobreviver a uma auditoria. Hoje o sistema não armazena essa prova. Ver Pendências P1.

### D2. Minimização

1. Coletar apenas telefone e os campos efetivamente usados nas variáveis do template.
2. Campos customizados de contato existem (`custom_field_definitions`), mas cada campo criado precisa ter finalidade declarada. Campo sem uso em template ou segmentação é dado excedente e deve ser removido.
3. Não trafegar dado sensível em variável de template. O conteúdo enviado fica registrado no histórico de mensagens e no payload de `webhook_events`.
4. Payloads brutos da Meta ficam integralmente em `webhook_events.payload` (`app/supabase/migrations/20260319000004_add_webhook_events_and_template_quality.sql`), sem política de expurgo. Ver Pendências P5.

### D3. Direito de exclusão e revogação

- Revogação de consentimento pelo titular: qualquer palavra-chave de opt-out gera supressão permanente em `phone_suppressions` (`app/app/api/webhook/route.ts`, `app/lib/phone-suppressions.ts`). Essa é a implementação do direito de oposição e da revogação do consentimento.
- Reinclusão: só pode ocorrer mediante novo consentimento comprovado. O sistema permite duas rotas: remoção da supressão por `DELETE /api/phone-suppressions/[phone]`, que exige autenticação por sessão ou chave de API (`app/app/api/phone-suppressions/[phone]/route.ts`), e desativação em lote de supressões quando a estratégia de importação é `OPT_IN` (`app/lib/supabase-db.ts`). A segunda rota é a mais perigosa do sistema: uma reimportação de planilha pode reativar números que pediram para sair. Ver Pendências P6.
- Exclusão de dados: a exclusão do contato não remove a supressão, e isso é correto. A supressão precisa sobreviver à exclusão do contato, caso contrário o número volta a ser alvo na próxima importação. A supressão isolada guarda apenas telefone, motivo, origem e carimbos, o mínimo necessário para cumprir a própria oposição.

### D4. Segurança e acesso

`phone_suppressions` tem RLS habilitado e acesso revogado para `anon` e `authenticated` (`app/supabase/migrations/00000000000000_init.sql`). Já `webhook_events` tem RLS habilitado com política de leitura liberada para `anon` (`anon_select_webhook_events`, na migration de 2026-03-19), e essa tabela contém payloads com números de telefone e conteúdo de mensagens. Ver Pendências P7.

---

## Checklist operacional final

Executar item a item antes de qualquer campanha. Cada item é verificável e tem evidência objetiva.

1. Origem do consentimento declarada e arquivada para 100 por cento da lista, com data, canal e texto do aceite.
2. Todos os telefones normalizados em E.164 e a lista deduplicada, conferido na prévia do disparo.
3. Consulta a `phone_suppressions` executada e destinatários suprimidos removidos do lote (o disparo faz isso, mas o resultado deve ser lido no relatório de descartes).
4. Contatos com `ContactStatus.OPT_OUT` ausentes do lote, conferido na contagem de descartes por código `OPT_OUT`.
5. Template com `status` igual a `APPROVED` e `quality_score` diferente de `RED` na tabela `templates`.
6. Todas as variáveis do template resolvíveis para todos os contatos do lote, sem descartes por variável faltante no pré-check.
7. Volume do lote menor ou igual à cota restante do tier no dia, validado por `validateCampaign` sem bloqueio.
8. Variáveis de throttling conferidas no ambiente: `WHATSAPP_ADAPTIVE_THROTTLE`, `WHATSAPP_ADAPTIVE_START_MPS`, `WHATSAPP_ADAPTIVE_MAX_MPS`, `WHATSAPP_ADAPTIVE_MIN_MPS`, `WHATSAPP_ADAPTIVE_COOLDOWN_SEC`, `WHATSAPP_ADAPTIVE_MIN_INCREASE_GAP_SEC`.
9. Zero alertas abertos em `account_alerts` do tipo `template` ou `system` referentes a qualidade nas últimas 24 horas.
10. Responsável nomeado, presente durante toda a janela de envio, com autoridade para pausar a campanha e critério de parada definido por escrito (sugestão de gatilho: taxa de falha acima de 5 por cento ou qualquer ocorrência de 130429 em três lotes consecutivos).

---

## Pendências

Lacunas verificadas no código. Enquanto não forem fechadas, a mitigação correspondente é procedimental e depende de disciplina do operador.

- P1. Prova de consentimento não é armazenada. A importação grava `ContactStatus.OPT_IN` de forma fixa em `app/app/api/contacts/import/route.ts`, e `app/lib/api-validation.ts` usa `OPT_IN` como padrão. Não há campos de origem, data e texto do aceite. Impacto: incapacidade de comprovar base legal em fiscalização ou em reclamação de titular. Correção sugerida: colunas `consent_source`, `consent_at` e `consent_evidence` em `contacts`, obrigatórias na importação.
- P2. Não existe aquecimento de número nem trava de rampa por idade do número ou por histórico do phone number id. A rampa da Camada A3 é manual.
- P3. Qualidade vermelha não bloqueia envio. Em `validateCampaign` (`app/lib/meta-limits.ts`) o quality score vermelho apenas gera aviso. Também não há pausa automática de campanha por queda de qualidade ou por pico de falhas: a pausa existente é manual, verificada por lote em `app/app/api/campaign/workflow/route.ts`.
- P4. O throttling adaptativo reage apenas ao erro 130429, não ao quality rating. Os eventos `message_template_quality_update` e `phone_number_quality_update` geram alertas em `account_alerts` (`app/lib/webhook-event-handlers.ts`), mas não alimentam o estado do controlador em `app/lib/whatsapp-adaptive-throttle.ts`. Correção sugerida: reduzir `targetMps` e aplicar cooldown ao receber qualidade amarela, e forçar `minMps` com pausa ao receber vermelha.
- P5. Sem política de retenção ou expurgo para `webhook_events`. A tabela guarda payloads completos indefinidamente, incluindo telefones e conteúdo de mensagem.
- P6. A desativação em lote de supressões na estratégia de importação `OPT_IN` (`app/lib/supabase-db.ts`) pode reativar números que exerceram opt-out, sem exigir nova prova de consentimento. Risco alto de violação direta de oposição do titular. Correção sugerida: exigir confirmação explícita e nunca reativar supressões cuja origem seja opt-out declarado pelo titular ou sinal da Meta.
- P7. `webhook_events` permite leitura pelo papel `anon` via a política `anon_select_webhook_events`, apesar de conter dados pessoais. Revisar para exigir papel autenticado com escopo.
- P8. As variáveis `WHATSAPP_ADAPTIVE_*` e `WHATSAPP_STATUS_DEDUPE_TTL_SECONDS` não constam em `app/.env.example`, o que torna a configuração de produção implícita e sujeita a divergência entre ambientes.
- P9. O dedupe de status é fail-open e depende de Redis (`app/lib/whatsapp-webhook-dedupe.ts`). Sem Redis configurado, retries da Meta geram carga e escrita duplicada no banco; a monotonicidade de status em `app/lib/whatsapp-status-events.ts` protege a consistência, mas não o custo.
- P10. A lista de palavras-chave de opt-out casa por inclusão de substring (`isOptOutKeyword` em `app/app/api/webhook/route.ts`). Isso é agressivo por escolha de projeto e pode gerar falso positivo, por exemplo em uma mensagem contendo "quero cancelar minha reserva anterior". Falso positivo em opt-out é erro seguro do ponto de vista de compliance, mas deve ser conhecido pelo negócio.
