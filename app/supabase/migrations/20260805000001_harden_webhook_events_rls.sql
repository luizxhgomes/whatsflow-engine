-- Hardening (auditoria de segurança): webhook_events guarda payloads com telefone
-- e conteúdo de mensagem. Leitura pelo papel anon expõe dados pessoais (LGPD).
-- Acesso passa a ser exclusivo do service_role (backend).
DROP POLICY IF EXISTS anon_select_webhook_events ON public.webhook_events;
REVOKE SELECT ON public.webhook_events FROM anon;
