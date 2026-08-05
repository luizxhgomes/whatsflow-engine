# Checklist de Deploy, whatsflow

Lista verificável antes de promover para produção. `@devops` é o owner formal; qualquer agente pode executar o checklist como preparação, mas o push final é exclusivo de `@devops`.

## Pré-Flight (Local / PR)

### Código
- [ ] `npm run lint` passa sem warnings novos.
- [ ] `npm run build` completa sem erros (gera `.next/`).
- [ ] TypeScript: `npx tsc --noEmit` sem erros.
- [ ] `npm run test` passa (unit + integration).
- [ ] Testes E2E relevantes ao escopo do PR passam.
- [ ] Coverage não regrediu em arquivos tocados (manual se CI não mede).

### Segurança
- [ ] Nenhum secret commitado (grep por `sk_`, `EAA`, `eyJ`, tokens conhecidos).
- [ ] `.env` **não** está no diff.
- [ ] Todas as rotas novas ou modificadas declaradas no `AUTH_POLICY` (ver ADR-003).
- [ ] Dependências adicionadas não introduzem `npm audit` critical/high.

### Documentação
- [ ] `docs/CHANGELOG.md` atualizado com entrada em `[Unreleased]`.
- [ ] ADR criado se decisão arquitetural (em `docs/architecture/`).
- [ ] Story correspondente (`docs/stories/`) com File List e checkboxes em dia.
- [ ] README raiz e `docs/README.md` refletem novas pastas/comandos se aplicável.

### Database
- [ ] Se há migration nova: testada localmente (`supabase db reset`).
- [ ] Migration é idempotente (`IF NOT EXISTS`/`IF EXISTS`).
- [ ] RLS habilitado em tabelas novas com policy explícita.
- [ ] Types TypeScript regenerados: `npx supabase gen types typescript > lib/database.types.ts`.
- [ ] Backfill preparado (se adiciona NOT NULL/UNIQUE em tabela existente).

## Pré-Deploy Staging

- [ ] PR aprovado por `@qa` (ou peer).
- [ ] Merge em branch de staging (ou deploy preview na Vercel).
- [ ] Smoke test manual em staging:
  - Login com `MASTER_PASSWORD` funciona.
  - Dashboard carrega sem erros no console.
  - Criar campanha simples (draft).
  - Enviar template para número de teste whitelistado.
  - Webhook inbound chega e atualiza status.
- [ ] Logs de staging sem `ERROR` não esperado nos últimos 30 min.
- [ ] Métricas: latência de `/api/webhook` < 1s p95, `/api/messages/*` < 3s p95.

## Migrations em Produção

**Sempre antes do código:**

1. Confirmar backup do Supabase (automatizado, mas conferir snapshot recente).
2. Rodar `supabase migration list` em produção para confirmar estado atual.
3. Aplicar migrations uma por uma (`supabase db push`).
4. Validar cada uma: query rápida checando schema esperado.
5. Só então promover código.

**Rollback plan:**
- Nunca rollback automático de migration. Documente no ADR/CHANGELOG o caminho de reversão (nova migration de desfazimento).

## Deploy Vercel

### Preview
- [ ] Todas as env vars preview configuradas (`vercel env ls`).
- [ ] Preview URL testada manualmente.

### Produção
- [ ] Branch `main` atualizada e CI verde.
- [ ] Release note em `CHANGELOG.md` promovido de `[Unreleased]` para versão.
- [ ] `@devops *push` ou merge manual com squash commit semântico.
- [ ] Deploy na Vercel inicia automaticamente.
- [ ] Acompanhar build em `vercel.com/{org}/{project}/deployments`.
- [ ] Smoke test em produção **imediatamente** após deploy.

## Pós-Deploy (T+30min)

- [ ] Logs sem spike de erros.
- [ ] Dashboards: contadores de `campaign_contacts` avançam normalmente.
- [ ] `account_alerts` não tem novo alerta de pagamento (131042).
- [ ] Webhook signature verification com 100% de sucesso (sem `skipped_missing_secret`).
- [ ] Rate limit adaptativo não saturou (tier não caiu para limite mínimo).

## Hotfix Path (emergência)

1. Branch a partir de `main` (não de feature antiga).
2. Fix minimal, um arquivo por problema.
3. PR marcado `[HOTFIX]`, review acelerado por `@qa`.
4. Merge + deploy imediatos.
5. Entrada dedicada no `CHANGELOG.md` com severidade.
6. Post-mortem em `docs/architecture/incident-{data}.md` dentro de 48h.

## Rollback de Produção

Preferência: **roll forward** (novo deploy que corrige).
Caso necessário reverter:
1. `vercel rollback` para deployment anterior.
2. Se migration foi aplicada, criar nova migration revertendo.
3. Registrar incidente em `docs/architecture/`.

## Ownership

| Ação | Quem |
|------|------|
| Executar checklist pré-flight | Qualquer agente / dev |
| Aprovar PR | `@qa` ou peer |
| Rodar migration em produção | `@data-engineer` + `@devops` |
| `git push` para main | `@devops` (exclusivo) |
| Disparar deploy Vercel | `@devops` |
| Pós-deploy monitoring | `@devops` + on-call |

## Referências

- `.claude/rules/agent-authority.md`: matriz de delegação
- `docs/architecture/ADR-003-auth-layering.md`: policy de auth
- `docs/architecture/ADR-004-webhook-dedup.md`: dedup
- `docs/guides/running-migrations.md`
