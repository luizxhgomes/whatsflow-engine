# Primeiro acesso e configuração

A revisão `ec7fab5`, publicada em 10/11/2026, usa Vercel com Next.js 16 e Node.js 22,
Neon PostgreSQL em São Paulo via PostgREST limitado na VPS, Upstash QStash e
Redis, e Vercel Blob privado.

## Usar a instância já publicada

1. Abra o [WhatsFlow em produção](https://whatsflow-engine.vercel.app/) e entre com sua senha de acesso.
2. Se a conexão Meta estiver ausente, o wizard oferece configurar o WhatsApp.
   Escolha **Explorar o painel**, feche o modal ou use Escape para adiar.
3. O adiamento permanece ao recarregar a página. Um novo login válido pode
   oferecer o guia novamente enquanto a conexão estiver ausente, inclusive ao
   abrir um link direto do Inbox.
4. Retome a conexão em **Configurações** ou no menu de tutoriais. O adiamento
   guarda apenas a preferência de interface da sessão.

Contatos, templates, campanhas e histórico exibem os dados disponíveis na
instância. Envio e recepção de mensagens dependem da conexão oficial com a Meta.

## Conectar a API oficial da Meta depois

Use o wizard e a página de diagnóstico Meta em Configurações. O fluxo cobre
app Business, WhatsApp Business Account (WABA), número, credenciais e webhook.
[Meta for Developers](https://developers.facebook.com/) | [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

Após conectar, valide o diagnóstico e, com autorização, um template para número
de teste e o recebimento do webhook. Guarde tokens nas variáveis protegidas do ambiente.

## Provisionar outra instância

Provisione serviços próprios para cada instalação Neon. O assistente de
instalação com Supabase está documentado no [manual do app](../../app/README.md).

1. Prepare um projeto Vercel com diretório raiz `app/` e runtime Node.js 22.
2. Provisione um banco Neon próprio. Revise as migrations em
   [`app/supabase/migrations/`](../../app/supabase/migrations/) e o runner
   [`app/infra/migrate-neon.mjs`](../../app/infra/migrate-neon.mjs); teste primeiro
   em branch isolada do banco, com roles e políticas correspondentes.
3. Configure o gateway a partir de
   [`app/infra/postgrest/compose.yaml`](../../app/infra/postgrest/compose.yaml).
   Ele usa role limitada, TLS e verificação JWT; a chave privada fica apenas no
   servidor do app. O Compose depende da rede e do proxy da VPS, portanto exige
   revisão para o ambiente de destino.
4. Provisione QStash e Redis próprios na [Upstash](https://upstash.com/) e um
   store privado no Vercel Blob. O app entrega mídia por URL assinada com prazo.
5. Configure as credenciais nas variáveis protegidas da instância. Aponte
   `WHATSFLOW_POSTGREST_URL` para o gateway e mantenha `NEON_DATA_API_PRIVATE_KEY`
   no servidor. Use o exemplo de ambiente do gateway e os contratos dos adaptadores
   para completar os grupos de autenticação, filas, cache e mídia.
6. Execute o [checklist de deploy](../guides/deploy-checklist.md), incluindo build,
   CSS servido por HTTP e conferência visual. Conecte a Meta quando for necessário.

## Verificação e referências legadas

Consulte `/api/health` com autenticação e avalie cada serviço separadamente.
Verifique banco, fila e cache para liberar o painel. Valide envio e recebimento
quando a conta Meta estiver conectada.

Os guias de [migrations](../guides/running-migrations.md),
[Docker/VPS](../../app/infra/DEPLOY-GUIDE.md) e o
[script de VPS](../../app/infra/setup-vps.sh) preservam instruções da base
original, incluindo o Supabase CLI e a instalação do app inteiro na VPS. Para
uma instância Vercel com Neon, siga a sequência de provisionamento acima.
