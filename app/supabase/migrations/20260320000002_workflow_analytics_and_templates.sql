-- Phase 3: Workflow Analytics + Template Gallery

-- 3.1 Analytics events per node
CREATE TABLE IF NOT EXISTS workflow_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id text NOT NULL,
  version_id text,
  node_id text NOT NULL,
  event_type text NOT NULL, -- 'entered', 'completed', 'dropped', 'timeout', 'error'
  phone text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_workflow
  ON workflow_analytics (workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_node_event
  ON workflow_analytics (workflow_id, node_id, event_type);

COMMENT ON TABLE workflow_analytics IS 'Per-node analytics events for funnel visualization';

-- 3.2 Template gallery
CREATE TABLE IF NOT EXISTS workflow_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  nodes jsonb NOT NULL,
  edges jsonb NOT NULL,
  thumbnail_url text,
  popularity integer DEFAULT 0,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wt_category
  ON workflow_templates (category);

COMMENT ON TABLE workflow_templates IS 'Pre-built workflow templates for the gallery';

-- Seed initial templates
INSERT INTO workflow_templates (id, name, description, category, tags, nodes, edges) VALUES
  ('tpl_onboarding', 'Onboarding de Cliente', 'Sequencia de boas-vindas com coleta de dados', 'Atendimento',
   ARRAY['onboarding', 'boas-vindas', 'coleta'],
   '[{"id":"trigger_1","type":"trigger","position":{"x":0,"y":200},"data":{"label":"Mensagem Recebida","type":"trigger","config":{"triggerType":"MessageReceived"}}},{"id":"msg_1","type":"action","position":{"x":300,"y":200},"data":{"label":"Boas-vindas","type":"action","config":{"actionType":"whatsapp/send-message","toSource":"inbound","message":"Ola! Bem-vindo(a) 👋\\nVamos comecar seu cadastro?"}}}]',
   '[{"id":"e1","source":"trigger_1","target":"msg_1"}]'),
  ('tpl_suporte', 'Suporte Basico', 'Menu de opcoes com direcionamento por departamento', 'Atendimento',
   ARRAY['suporte', 'menu', 'departamento'],
   '[{"id":"trigger_1","type":"trigger","position":{"x":0,"y":200},"data":{"label":"Palavras-chave","type":"trigger","config":{"triggerType":"Keywords","keywordList":"ajuda\\nsuporte\\nhelp"}}},{"id":"msg_1","type":"action","position":{"x":300,"y":200},"data":{"label":"Menu Suporte","type":"action","config":{"actionType":"whatsapp/send-buttons","toSource":"inbound","body":"Como posso ajudar?","buttons":"[{\"id\":\"vendas\",\"title\":\"Vendas\"},{\"id\":\"tecnico\",\"title\":\"Suporte Tecnico\"},{\"id\":\"financeiro\",\"title\":\"Financeiro\"}]"}}}]',
   '[{"id":"e1","source":"trigger_1","target":"msg_1"}]'),
  ('tpl_agendamento', 'Agendamento', 'Coleta de data e horario para agendamento', 'Vendas',
   ARRAY['agendamento', 'data', 'horario'],
   '[{"id":"trigger_1","type":"trigger","position":{"x":0,"y":200},"data":{"label":"Mensagem Recebida","type":"trigger","config":{"triggerType":"MessageReceived"}}},{"id":"ask_1","type":"action","position":{"x":300,"y":200},"data":{"label":"Qual data?","type":"action","config":{"actionType":"whatsapp/ask-question","toSource":"inbound","message":"Qual data voce prefere para o agendamento?","variableKey":"data_preferida"}}}]',
   '[{"id":"e1","source":"trigger_1","target":"ask_1"}]'),
  ('tpl_reengagement', 'Re-engagement Marketing', 'Template de reativacao de contatos inativos', 'Marketing',
   ARRAY['marketing', 're-engagement', 'reativacao'],
   '[{"id":"trigger_1","type":"trigger","position":{"x":0,"y":200},"data":{"label":"Manual","type":"trigger","config":{"triggerType":"Manual"}}},{"id":"msg_1","type":"action","position":{"x":300,"y":200},"data":{"label":"Template Reativacao","type":"action","config":{"actionType":"whatsapp/send-template","toSource":"inbound","templateName":"reengagement_v1","language":"pt_BR"}}}]',
   '[{"id":"e1","source":"trigger_1","target":"msg_1"}]'),
  ('tpl_qualificacao', 'Qualificacao de Lead', 'Sequencia de perguntas para qualificar leads', 'Vendas',
   ARRAY['lead', 'qualificacao', 'vendas'],
   '[{"id":"trigger_1","type":"trigger","position":{"x":0,"y":200},"data":{"label":"Palavras-chave","type":"trigger","config":{"triggerType":"Keywords","keywordList":"preco\\norcamento\\nvalor"}}},{"id":"ask_1","type":"action","position":{"x":300,"y":200},"data":{"label":"Nome","type":"action","config":{"actionType":"whatsapp/ask-question","toSource":"inbound","message":"Qual seu nome?","variableKey":"lead_nome"}}},{"id":"ask_2","type":"action","position":{"x":600,"y":200},"data":{"label":"Empresa","type":"action","config":{"actionType":"whatsapp/ask-question","toSource":"inbound","message":"Qual sua empresa?","variableKey":"lead_empresa"}}}]',
   '[{"id":"e1","source":"trigger_1","target":"ask_1"},{"id":"e2","source":"ask_1","target":"ask_2"}]')
ON CONFLICT (id) DO NOTHING;
