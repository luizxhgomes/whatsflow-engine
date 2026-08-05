-- ============================================================================
-- Migration: webhook_events table + templates.quality_score column
-- Purpose: Log ALL webhook events from Meta + track template quality
-- ============================================================================

-- 1. Tabela webhook_events — registro durável de todos os eventos do webhook
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id text DEFAULT concat('whe_', replace((extensions.uuid_generate_v4())::text, '-'::text, ''::text)) NOT NULL,
    event_type text NOT NULL,
    field text NOT NULL,
    waba_id text,
    payload jsonb NOT NULL DEFAULT '{}',
    metadata jsonb,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.webhook_events (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_field ON public.webhook_events (field);

-- RLS: allow anon select (same pattern as account_alerts)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_select_webhook_events ON public.webhook_events FOR SELECT TO anon USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_events;

-- 2. Coluna quality_score na tabela templates (GREEN/YELLOW/RED)
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS quality_score text;
