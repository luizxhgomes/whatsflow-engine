# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato é baseado em **[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)** e este projeto segue **[Semantic Versioning](https://semver.org/lang/pt-BR/)**.

## [Unreleased]

### Added

#### WhatsApp Flows (MiniApps Dinâmicos)
- **Editor Unificado ("Tela Viva")**: Um único editor visual que suporta todos os tipos de Flow (formulário, agendamento, dinâmico).
- **Preview editável inline**: Clique direto no preview para editar títulos, labels e botões.
- **Caminhos (ramificação)**: Configuração de rotas condicionais sem editar JSON.
- **Progressive Disclosure**: Modo avançado escondido até ser necessário.
- **Confirmação pós-Flow**: Mensagem automática de resumo após finalização.
- **Publicação na Meta**: Suporte completo a `routing_model`, `data_api_version: 3.0` e criptografia.
- **Templates dinâmicos**: Badges "Simples"/"Dinâmico" e resolução de placeholders `${data.*}`.

#### Agendamento (Google Calendar)
- **Wizard de agendamento**: UI simplificada com 4 passos + preview dinâmico.
- **CalendarPicker**: Calendário visual (v7.3 da Meta) com datas indisponíveis.
- **Webhook externo**: Envio de payload JSON para URL configurável.
- **Confirmação configurável**: Título, rodapé e campos personalizáveis.
- **Serviços editáveis**: Sincronização entre editor e endpoint.

#### Debug & Observabilidade
- **Timeline de trace**: Tabela `campaign_trace_events` para inspeção de execuções.
- **Trace View**: Painel de debug nos detalhes da campanha com auto-seleção do último run.
- **Correlação ponta-a-ponta**: `traceId` do dispatch ao webhook.

#### Segurança (Sentinel)
- Headers HTTP defensivos (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc.).
- Proteção de endpoints sensíveis (`/api/setup/*`) com API key obrigatória.
- Blindagem pós-instalação: rotas de setup desativadas após `SETUP_COMPLETE=true`.
- Validação de assinatura `X-Hub-Signature-256` no webhook Meta.
- Rotas `/api/contacts/**` exigem sessão ou API key.

#### UX & Acessibilidade
- **100+ micro-melhorias de acessibilidade**: ARIA labels, focus-visible, aria-live regions.
- **Tooltips** em todos os botões icon-only.
- **ConfirmationDialog** reutilizável para ações destrutivas.
- **Loading Skeletons** com animações escalonadas.
- **Hover Effects** com glow sutil em cards e tabelas.

#### DevTools
- **Painel ngrok**: Controle de túneis em dev com Agent API.
- **Auto-start ngrok**: Detecta e inicia automaticamente ao abrir Configurações.
- **QStash com ngrok**: Disparo de campanhas funciona em ambiente local.
- Script `npm run dev:with-ngrok` para iniciar Next.js + ngrok juntos.
- Script `npm run whatsapp:context` para gerar contexto compacto de docs.

### Changed
- Form builder agora suporta múltiplas etapas (telas).
- Preview Meta simula navegação real via `routing_model`.
- Clone de campanha usa rota `/api/campaigns/:id/clone`.
- Datas do Flow em formato `DD/MM/YYYY` com dia da semana.

### Fixed
- **Espaços preservados**: Editor não remove mais espaços em títulos, labels e botões.
- **Confirmação sem duplicação**: Webhook não reempilha campos do resumo.
- **Fallback de confirmação**: Busca por `flow_token`, `message_id` ou `from_phone`.
- **Publish de flows dinâmicos**: Remoção de metadados internos (`__editor_*`, `__builder_id`).
- **Chave pública Meta**: Parser corrigido para `data.data[0]`.
- **Health check criptografado**: Ping do endpoint agora retorna resposta encriptada.
- **Build errors**: 6+ erros de TypeScript corrigidos.

---

## [2.0.0] - 2025-12-13

### Added
- Base do template **WhatsFlow v2** com Next.js (App Router), React e Tailwind.

- Dashboard (área autenticada) com visão de métricas e status do sistema.

- **Contatos**
  - CRUD completo (rotas `/api/contacts`, `/api/contacts/[id]`).
  - Importação via CSV (`/api/contacts/import`) e estatísticas (`/api/contacts/stats`).
  - Tags, notas e **campos personalizados** (rotas `/api/custom-fields`).
  - UI de **edição rápida** de contato no contexto de campanhas (`ContactQuickEditModal`).
  - Controle de cache em rotas para reduzir retorno de dados obsoletos ("flash-back").

- **Campanhas**
  - CRUD/listagem/detalhes (`/campaigns`, `/campaigns/[id]`, `/api/campaigns`, `/api/campaigns/[id]`).
  - Detalhes com **estatísticas de mensagens** e visão de entregas/leitura/falhas.
  - Disparo em massa (`/api/campaign/dispatch`) e workflow (`/api/campaign/workflow`).
  - Reenvio e tratamento de mensagens puladas (`/api/campaigns/[id]/resend-skipped`).
  - Pré-checagem (pre-check) para contatos/variáveis antes do disparo (`/api/campaign/precheck`).

- **Templates**
  - Listagem/detalhes/criação/remoção em lote (`/api/templates`, `/api/templates/[name]`, `/api/templates/create`, `/api/templates/bulk-delete`).
  - Projetos/fábrica de templates (`/api/template-projects`, sync, itens).
  - Validação/contrato de templates do WhatsApp e utilitários de consistência.

- **IA**
  - Rotas para geração de templates com IA (`/api/ai/generate-template`, `/api/ai/generate-utility-templates`).

- **Configuração & Setup guiado**
  - Wizard e rotas de bootstrap/migração/validação de ambiente (`/setup` e `/api/setup/*`).
  - Rotas de settings para credenciais e parâmetros do app (`/api/settings/*`).
  - Gestão de contato de teste (`/api/settings/test-contact`).

- **Integrações & Operação**
  - Webhook (`/api/webhook`) e endpoints de diagnóstico (`/api/webhook/info`, `/api/health`, `/api/system`).
  - Rotas de uso/limites e alertas de conta (`/api/usage`, `/api/account/alerts`, `/api/account/limits`).
  - Integração com Vercel (info/redeploy) (`/api/vercel/*`) e config de deploy (`vercel.json`).
  - Suporte a phone numbers do WhatsApp (`/api/phone-numbers/*`).

- Banco de dados **Supabase** (Postgres) com schema/migration consolidada e índices para:
  - `campaigns`, `contacts`, `campaign_contacts`, `templates`, `settings`, `account_alerts`, `template_projects`, `template_project_items`, `custom_field_definitions`.
  - Estratégia de "snapshot" de contato por campanha (ex.: email/custom_fields no momento da campanha).

- Funções RPC no Postgres:
  - `get_dashboard_stats()` para estatísticas agregadas.
  - `increment_campaign_stat(campaign_id_input, field)` para incremento atômico de contadores.

- Realtime habilitado via `supabase_realtime` (publication) para entidades principais (campanhas, contatos, itens de campanha, alertas, campos personalizados).

- Autenticação com **multi-sessão** e gestão de tokens de sessão.

- Qualidade/DevEx
  - Lint com **ESLint** (Next.js + TypeScript).
  - Testes com **Vitest** (configuração inicial para unit/integration).
  - Scripts/utilitários diversos em `scripts/` (auditoria/checagens/migrações auxiliares) e relatórios em `test-results/`.

### Changed
- Atualização do `@upstash/workflow` para `0.3.0-rc` e ajuste de `overrides` para `jsondiffpatch`.
- Remoção de configuração de headers CORS do `next.config.ts` (centralizando políticas na borda/infra quando aplicável).
- Melhoria de cache/controle de staleness em rotas de contatos (cabeçalhos) para reduzir "flash-back" de dados.
- Ajustes na visualização de campanha para considerar status **SKIPPED**.
- Refactors de organização/legibilidade e ajustes de fluxo em rotas (ex.: atualização de contatos e campos personalizados).
- Campanhas: atualização de lógica para **anexar `campaign_id`** em updates relacionados a contatos e **filtrar updates inválidos**.

### Fixed
- Correções de tipos/valores nulos para timestamps de campanhas (ex.: `completedAt` indefinido → `null`).
- Correções no pre-check (`precheckContactForTemplate`) para diagnosticar valores faltantes com mais precisão.
- Melhorias no tratamento de erro do `contactService` em operações de leitura.
- Correção de import de rotas para o tipo correto.

### Removed
- Remoção de dependência do `@google/genai` do `package.json`.
- Remoção de alguns testes/unitários e artefatos auxiliares (mantendo a base do template mais enxuta).
- Remoção do diretório `.tmp/` (conteúdos de referência, specs e testes avançados que não fazem parte do "core" do template educacional).

---

[Unreleased]: https://github.com/luizxhgomes/whatsflow/compare/885be45...HEAD
[2.0.0]: https://github.com/luizxhgomes/whatsflow/compare/8505c0f...885be45
