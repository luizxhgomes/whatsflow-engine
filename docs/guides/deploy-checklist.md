# Checklist de deploy

Lista verificável antes de promover para produção. `@devops` executa push e
publicação após autorização. Os demais agentes podem preparar e revisar.
Referência publicada em 10/11/2026: `ec7fab5`, Vercel com Next.js 16/Node.js 22,
Neon PostgreSQL em São Paulo via PostgREST limitado na VPS, Upstash QStash/Redis
e Vercel Blob privado. A conexão Meta permanece opcional para usar o painel.

## Preparação local e revisão

Execute os comandos do app a partir de `app/`.

- [ ] Confirmar branch, SHA e arquivos do release e preservar alterações de outras frentes.
- [ ] Lint e `npx tsc --noEmit` sem regressões nos arquivos tocados.
- [ ] Testes pertinentes passam. Registrar falhas legadas com a evidência da revisão anterior.
- [ ] `npm run build` termina com sucesso. O comando executa `next build` e
      [`scripts/verify-brand-css.mjs`](../../app/scripts/verify-brand-css.mjs).
- [ ] O gate verifica o CSS referenciado pelos manifests de login e dashboard,
      incluindo espaçamentos, altura do header, reflexo coral e `.ds-icon-tile`.
- [ ] E2E e smoke relevantes à mudança passam. Comparar a cobertura com a revisão anterior.
- [ ] Revisão independente concluída antes da publicação.

### Segurança e documentação

- [ ] Nenhum segredo, arquivo de ambiente ou dado real de cliente entra no diff ou nos logs de validação.
- [ ] Rotas novas mantêm o contrato de autenticação e assinatura aplicável; revisar o [ADR-003](../architecture/ADR-003-auth-layering.md) junto ao código atual.
- [ ] Dependências alteradas têm auditoria revisada, sem atualização forçada ou risco oculto.
- [ ] Changelog, README, ADR e story existentes são atualizados quando pertinentes, sem promover versão por rotina.
- [ ] Primeiro acesso permite explorar/fechar/adiar o wizard sem gravar credenciais ou concluir a conexão Meta.

## Banco de dados

O caminho publicado é Neon. Os arquivos em `app/supabase/migrations/` formam o
histórico SQL. O Supabase CLI pertence ao fluxo de instalação legado.

- [ ] Migration revisada e testada numa branch isolada do Neon com o
      [runner do repositório](../../app/infra/migrate-neon.mjs).
- [ ] Compatibilidade entre código antigo/novo e schema avaliada antes de escolher a ordem de aplicação.
- [ ] Roles limitadas, RLS, permissões e contratos de tipos verificados.
- [ ] Backup ou ponto de restauração confirmado antes de alterar o banco, com plano de reversão.
- [ ] Migrations aplicadas e schema conferidos sem copiar dados ou credenciais para evidências públicas.
- [ ] Quando o schema muda, recarregar de forma controlada o cache do PostgREST:
      o [Compose atual](../../app/infra/postgrest/compose.yaml) desativa o canal de notificações.

Para reverter alterações de schema, defina uma migration corretiva ou uma
restauração aprovada conforme o risco.

## Preview e promoção

- [ ] Configuração de preview separada da produção e runtime Node.js 22 confirmado.
- [ ] Preview corresponde ao SHA aprovado e passa pelo mesmo build com gate de CSS.
- [ ] Login, dashboard, contatos, templates, campanhas e Inbox abrem sem erros inesperados.
- [ ] Link direto do Inbox mantém a navegação; rascunho não desaparece ao cruzar o breakpoint mobile/desktop.
- [ ] Se Meta está ausente, é possível explorar o painel e configurar depois.
- [ ] Com a Meta conectada, use um número de teste autorizado para validar envio,
      recebimento, assinatura do webhook e atualização de status.
- [ ] Logs e respostas do gateway não apresentam erros inesperados; limites e latências são medidos, não presumidos.
- [ ] `@devops` publica o SHA aprovado, acompanha o build e valida o domínio final.

## CSS real e validação visual

A publicação anterior reutilizou CSS antigo do cache de build. A correção fez
uma compilação limpa e adicionou uma verificação do CSS gerado. O teste em
320 px também passou a cobrir o ajuste dos filtros de Contatos.

- [ ] Fazer GET HTTP do HTML de login e dos assets CSS referenciados, sem depender
      do service worker do navegador. Confirmar os mesmos marcadores exigidos
      pelo script e conferir conteúdo/hash quando houver divergência.
- [ ] Repetir o teste no domínio público após a promoção e comparar os hashes dos arquivos.
- [ ] Se os marcadores faltarem, interromper a promoção e investigar fonte,
      manifests e cache de build. Use um GET HTTP direto para isolar a resposta da Vercel.
- [ ] Abrir o release no Chrome, conferir estilos computados e as aparências clara e escura.
- [ ] Verificar login, dashboard, contatos, templates, campanhas e Inbox em
      320 e 390 px, tablet, desktop, paisagem e diferentes níveis de zoom.
- [ ] Os elementos cabem na largura da página, o modal rola quando necessário e
      os botões ficam acessíveis por toque e teclado.
- [ ] Logo, ícones, espaçamentos e fallback sem animação estão corretos.
      Registrar viewport/zoom e evidência visual antes de concluir.

## Pós-deploy e recuperação

- [ ] Repetir login e navegação no endereço publicado e verificar logs e health por serviço.
- [ ] Confirmar adiamento do wizard após reload e nova oferta após login válido
      quando a Meta estiver ausente.
- [ ] Se houver tráfego autorizado, acompanhar filas, falhas de campanha, alertas
      da conta, assinatura dos webhooks e limites adaptativos.
- [ ] Registrar SHA, resultado dos gates, pendências e responsável pela operação.

Para hotfix, partir da revisão publicada, aplicar a correção mínima, revisar e
passar pelos gates correspondentes. Prefira um deploy corretivo. Para voltar
à versão anterior do app, confira schema e configuração antes da promoção e
trate a recuperação do banco pelo procedimento próprio.

## Responsabilidades e referências

| Ação | Responsável |
|---|---|
| Preparar checklist e provas | Implementador |
| Revisar o release | `@qa` ou peer independente |
| Alterar banco em produção | `@data-engineer` com coordenação de `@devops` |
| Push, publicação e promoção | `@devops`, após autorização |
| Smoke e acompanhamento | `@devops` e responsável pela operação |

- [Setup atual e referências legadas](../setup/README.md)
- [Topologia](../architecture/TOPOLOGIA.md)
- [Auth em camadas](../architecture/ADR-003-auth-layering.md)
- [Deduplicação de webhook](../architecture/ADR-004-webhook-dedup.md)
- [Guia legado de migrations](running-migrations.md)
