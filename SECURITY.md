# Política de Segurança

## Segredos
Nenhum segredo é versionado neste repositório. Todo credenciamento acontece via
variáveis de ambiente — o contrato completo está em `app/.env.example`.
Arquivos `.env*` são bloqueados pelo `.gitignore`.

## Webhooks
Webhooks da Meta são validados por assinatura HMAC (`META_APP_SECRET`).
Nunca desative a verificação (`WEBHOOK_ALLOW_UNSIGNED`) em produção.

## Reporte de vulnerabilidades
Abra uma issue com o rótulo `security` sem incluir detalhes exploráveis,
ou contate o mantenedor diretamente via GitHub.

## Garantias auditadas
As garantias de segurança do disparo (HMAC, dedup, throttling, RLS) estão documentadas
com paths do código e formas de teste em `docs/seguranca/`.
