-- Story 1.2: Advanced Filters - Novas colunas para filtros avancados no Inbox

-- Coluna: admin atribuido a conversa
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Coluna: campanha de origem
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS campaign_id uuid;

-- Coluna: fonte da conversa
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS source text DEFAULT 'organic'::text;
ALTER TABLE public.inbox_conversations ADD CONSTRAINT inbox_conversations_source_check
  CHECK (source IN ('organic', 'campaign', 'flow', 'manual'));

-- Indices compostos para filtros avancados
CREATE INDEX IF NOT EXISTS idx_conv_assigned_status ON public.inbox_conversations(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_conv_campaign ON public.inbox_conversations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conv_source ON public.inbox_conversations(source);
