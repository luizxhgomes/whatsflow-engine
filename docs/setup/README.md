# Setup, do zero ao primeiro disparo

Guia de provisionamento completo do WhatsFlow Engine. Tempo estimado: 30 minutos.

## 1. Supabase
1. Crie um projeto em https://supabase.com.
2. Copie `Project URL`, `anon key` e `service_role key` para o `.env`.
3. Rode as migrations: `app/supabase/migrations/*.sql` (via SQL editor ou `supabase db push`).

## 2. Meta WhatsApp Cloud API (API Oficial)
1. Crie um app em https://developers.facebook.com (tipo Business).
2. Adicione o produto **WhatsApp** e conecte (ou crie) o WABA, WhatsApp Business Account.
3. Registre um número de telefone e anote o `Phone Number ID`.
4. Gere um **token permanente** via System User no Business Manager (escopos `whatsapp_business_messaging`, `whatsapp_business_management`).
5. Configure o webhook: URL `https://SEU_DOMINIO/api/webhook`, verify token = `WEBHOOK_VERIFY_TOKEN` do seu `.env`; assine os campos `messages` e `message_template_status_update`.

## 3. Upstash (fila e cache)
1. Crie um QStash (copie token + signing keys) e um Redis (URL + token) em https://upstash.com.

## 4. Variáveis de ambiente
```bash
cp app/.env.example app/.env
# preencha todos os grupos: App, Supabase, Meta, Upstash
```

## 5. Deploy
- **Vercel (recomendado):** importe o diretório `app/`, cole as variáveis, deploy. O installer embutido (`/api/installer`) automatiza parte do provisionamento.
- **Docker/VPS:** veja `app/infra/DEPLOY-GUIDE.md` e `app/infra/setup-vps.sh`.

## 6. Verificação
1. Acesse `/api/health`, deve responder OK.
2. Use a página de diagnóstico Meta no dashboard para validar token, número e webhook.
3. Envie um template de teste para o seu próprio número.
