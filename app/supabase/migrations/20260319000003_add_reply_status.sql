-- Story 1.3: Reply Status - Separacao de conversas por respondidas/nao respondidas

-- Coluna: status de resposta
ALTER TABLE public.inbox_conversations ADD COLUMN IF NOT EXISTS reply_status text DEFAULT 'unreplied'::text;
ALTER TABLE public.inbox_conversations ADD CONSTRAINT inbox_conversations_reply_status_check
  CHECK (reply_status IN ('replied', 'unreplied'));

-- Indice composto para filtros por reply_status
CREATE INDEX IF NOT EXISTS idx_conv_reply_status ON public.inbox_conversations(reply_status, status);

-- Backfill: atualizar conversas existentes baseado na ultima mensagem
UPDATE public.inbox_conversations c SET reply_status =
  CASE WHEN (
    SELECT direction FROM public.inbox_messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC LIMIT 1
  ) = 'inbound' THEN 'unreplied' ELSE 'replied' END
WHERE EXISTS (
  SELECT 1 FROM public.inbox_messages WHERE conversation_id = c.id
);

-- RPC: Contar conversas por reply_status (para tabs)
CREATE OR REPLACE FUNCTION public.get_reply_status_counts(
  p_status text DEFAULT NULL
)
RETURNS TABLE(reply_status text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ic.reply_status,
    COUNT(*) as count
  FROM public.inbox_conversations ic
  WHERE (p_status IS NULL OR ic.status = p_status)
  GROUP BY ic.reply_status;
$$;
