# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## Produção | 2026-11-10

### Infraestrutura e operação

- Banco próprio no Neon PostgreSQL, com acesso do servidor por PostgREST de permissão limitada. Upstash QStash e Redis para filas e cache. Vercel Blob privado para mídia.
- Reinício da base operacional após backup, com cadastro de contatos do zero e histórico anterior guardado em ambiente privado.
- Indicadores do dashboard para contatos, templates, campanhas e Inbox. Métricas de atendimento e de campanhas aparecem em seções próprias.
- Onboarding da Meta opcional. A escolha **Explorar o painel** vale para a sessão e a opção volta no próximo login enquanto a conexão estiver sem configuração.

### Interface e publicação

- Identidade visual aplicada ao login e ao painel, com logo oficial, movimento reduzido, temas claro e escuro e espaços que se ajustam à tela.
- Recuperação dos estilos publicados após o reaproveitamento de CSS antigo. A compilação limpa de [`ec7fab5`](https://github.com/luizxhgomes/whatsflow-engine/commit/ec7fab59d21aa624594d01f1c19a5dea3069213b) restaurou a apresentação. O build passou a exigir a verificação do CSS usado pelo login e pelo dashboard.
- Filtros e rolagem de Contatos corrigidos em 320 px. Login e painel verificados em dez tamanhos de 320 a 2.880 px. As sete rotas principais passaram nas duas larguras extremas.
- Login e painel verificados no domínio público. Envios reais e recebimento dependem da ativação da conta Meta.

## [1.0.0], 2026-08-05

Primeira versão pública do WhatsFlow Engine.

### Destaques
- Disparo em massa via API Oficial do WhatsApp (Meta Cloud API) com fila QStash e throttling adaptativo por qualidade de número.
- Inbox de atendimento com visual WhatsApp Business e IA multi-provider (AI SDK v6) com memória.
- Templates HSM: criação, submissão e preview fiel.
- Workflow builder visual (React Flow) para jornadas conversacionais.
- Contatos com import CSV validado e rastreio de opt-in.
- Installer automático: provisiona Supabase e Vercel.
- 3.500+ testes (Vitest + Playwright), 217 rotas de API, 10 migrations.
